import { getUserToken } from '@/helpers/user-token';

export class DataService {
  private static baseUrl: string | null = null;

  public static setBaseUrl(baseUrl: string): void {
    DataService.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private static buildHeaders(initHeaders?: HeadersInit, isAuthorized = true): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...((initHeaders as Record<string, string>) ?? {}),
    });
    if (isAuthorized) {
      const token = getUserToken();
      if (token) headers.append('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  public static async get(
    url: string,
    initHeaders?: HeadersInit,
    isAuthorized = true,
  ): Promise<Response> {
    return fetch(`${this.baseUrl}${url}`, {
      method: 'GET',
      headers: DataService.buildHeaders(initHeaders, isAuthorized),
    });
  }

  public static async delete(
    url: string,
    data?: unknown,
    initHeaders?: HeadersInit,
    isAuthorized = true,
  ): Promise<Response> {
    return fetch(`${this.baseUrl}${url}`, {
      method: 'DELETE',
      headers: DataService.buildHeaders(initHeaders, isAuthorized),
      body: data == null ? undefined : JSON.stringify(data),
    });
  }

  public static async post(
    url: string,
    data?: unknown,
    initHeaders?: HeadersInit,
    isAuthorized = true,
  ): Promise<Response> {
    return fetch(`${this.baseUrl}${url}`, {
      method: 'POST',
      headers: DataService.buildHeaders(initHeaders, isAuthorized),
      body: data == null ? undefined : JSON.stringify(data),
    });
  }

  public static async put(
    url: string,
    data?: unknown,
    initHeaders?: HeadersInit,
    isAuthorized = true,
  ): Promise<Response> {
    return fetch(`${this.baseUrl}${url}`, {
      method: 'PUT',
      headers: DataService.buildHeaders(initHeaders, isAuthorized),
      body: data == null ? undefined : JSON.stringify(data),
    });
  }

  public static async patch(
    url: string,
    data?: unknown,
    initHeaders?: HeadersInit,
    isAuthorized = true,
  ): Promise<Response> {
    return fetch(`${this.baseUrl}${url}`, {
      method: 'PATCH',
      headers: DataService.buildHeaders(initHeaders, isAuthorized),
      body: data == null ? undefined : JSON.stringify(data),
    });
  }

  public static async postForm(
    url: string,
    formData: FormData,
    initHeaders?: HeadersInit,
    isAuthorized = true,
  ): Promise<Response> {
    const headers = new Headers((initHeaders as Record<string, string>) ?? {});
    if (isAuthorized) {
      const token = getUserToken();
      if (token) headers.append('Authorization', `Bearer ${token}`);
    }
    return fetch(`${this.baseUrl}${url}`, {
      method: 'POST',
      headers,
      body: formData,
    });
  }
}
