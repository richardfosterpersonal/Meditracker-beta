import { rest } from 'msw';
import { SetupServerApi } from 'msw/node';

export interface TestContext {
  server: SetupServerApi;
}

export interface MockResponse<T = any> {
  status: number;
  data: T;
}

export interface APIHandlerContext {
  status: (statusCode: number) => APIHandlerContext;
  json: <T>(data: T) => MockResponse<T>;
}

export type RequestHandler = (
  req: {
    body: any;
    params: Record<string, string>;
    headers: Record<string, string>;
  },
  res: (ctx: APIHandlerContext) => MockResponse,
  ctx: APIHandlerContext
) => MockResponse;

export interface TestUtils {
  renderWithProviders: (ui: React.ReactElement) => {
    container: HTMLElement;
    getByText: (text: string) => HTMLElement;
    findByText: (text: string) => Promise<HTMLElement>;
  };
  createMockServer: () => SetupServerApi;
  mockHandlers: {
    auth: {
      login: RequestHandler;
      logout: RequestHandler;
    };
    medications: {
      list: RequestHandler;
      create: RequestHandler;
      update: RequestHandler;
      delete: RequestHandler;
    };
    emergency: {
      notify: RequestHandler;
    };
  };
}
