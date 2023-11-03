import {v4 as uuidv4} from 'uuid'

import KeyManager from './key-manager'
import JwtTokenManager from './jwt-token-manager'

const unAuthenticatedAdminEndpoints = {
    '/admin/auth': 'POST',
    '/admin/users/password-token': 'POST',
    '/admin/users/reset-password': 'POST',
    '/admin/invites/accept': 'POST',
}

export interface Config {
    baseUrl: string
    maxRetries: number
    apiKey?: string
    publishableApiKey?: string
    customHeaders?: Record<string, any>
}

export interface RequestOptions {
    timeout?: number
    numberOfRetries?: number
}

export type RequestMethod = 'DELETE' | 'POST' | 'GET'

const defaultConfig = {
    maxRetries: 0,
    baseUrl: 'http://localhost:9000',
}

class Client {
    private config: Config

    constructor(config: Config) {
        /** @private @constant {AxiosInstance} */

        /** @private @constant {Config} */
        this.config = {...defaultConfig, ...config}
    }

    shouldRetryCondition(
        err: Error,
        numRetries: number,
        maxRetries: number
    ): boolean {
        // TODO: Support retry attempts
        return false
    }

    // Stolen from https://github.com/stripe/stripe-node/blob/fd0a597064289b8c82f374f4747d634050739043/lib/utils.js#L282
    normalizeHeaders(obj: object): Record<string, any> {
        if (!(obj && typeof obj === 'object')) {
            return obj
        }

        return Object.keys(obj).reduce((result, header) => {
            result[this.normalizeHeader(header)] = obj[header]
            return result
        }, {})
    }

    // Stolen from https://github.com/marten-de-vries/header-case-normalizer/blob/master/index.js#L36-L41
    normalizeHeader(header: string): string {
        return header
            .split('-')
            .map(
                (text) => text.charAt(0).toUpperCase() + text.substr(1).toLowerCase()
            )
            .join('-')
    }

    requiresAuthentication(path, method): boolean {
        return (
            path.startsWith('/admin') &&
            unAuthenticatedAdminEndpoints[path] !== method
        )
    }

    /**
     * Creates all the initial headers.
     * We add the idempotency key, if the request is configured to retry.
     * @param {object} userHeaders user supplied headers
     * @param {Types.RequestMethod} method request method
     * @param {string} path request path
     * @param {object} customHeaders user supplied headers
     * @return {object}
     */
    setHeaders(
        userHeaders: RequestOptions,
        method: RequestMethod,
        path: string,
        customHeaders: HeadersInit = {}
    ): HeadersInit {
        let defaultHeaders: Record<string, any> = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
        }

        if (this.config.apiKey && this.requiresAuthentication(path, method)) {
            defaultHeaders = {
                ...defaultHeaders,
                'x-medusa-access-token': this.config.apiKey,
            }
        }

        const domain: 'admin' | 'store' = path.includes('admin') ? 'admin' : 'store'

        if (JwtTokenManager.getJwt(domain)) {
            defaultHeaders = {
                ...defaultHeaders,
                Authorization: `Bearer ${JwtTokenManager.getJwt(domain)}`,
            }
        }

        const publishableApiKey =
            this.config.publishableApiKey || KeyManager.getPublishableApiKey()

        if (publishableApiKey) {
            defaultHeaders['x-publishable-api-key'] = publishableApiKey
        }

        // only add idempotency key, if we want to retry
        if (this.config.maxRetries > 0 && method === 'POST') {
            defaultHeaders['Idempotency-Key'] = uuidv4()
        }

        return {...defaultHeaders, ...this.normalizeHeaders(userHeaders), ...customHeaders}
    }

    /**
     * Axios request
     * @param method request method
     * @param path request path
     * @param payload request payload
     * @param options axios configuration
     * @param customHeaders custom request headers
     * @return
     */
    async request(
        method: RequestMethod,
        path: string,
        payload: Record<string, any> = {},
        options: RequestOptions = {},
        customHeaders: Record<string, any> = {}
    ): Promise<any> {

        customHeaders = {...this.config.customHeaders, ...customHeaders}

        const reqOpts: RequestInit = {
            method,
            credentials: 'include',
            headers: new Headers(this.setHeaders(options, method, path, customHeaders)),
        }

        if (['POST', 'DELETE'].includes(method)) {
            reqOpts['data'] = payload
        }

        const response = await fetch(`${this.config.baseUrl}${path}`, reqOpts);
        const data = await response.json()

        // e.g. would return an object like of this shape { cart, response }
        return {...data, response}
    }
}

export default Client
