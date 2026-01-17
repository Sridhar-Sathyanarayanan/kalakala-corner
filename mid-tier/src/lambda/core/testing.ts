import { APIGatewayProxyEvent, Context as LambdaContext } from "aws-lambda";
import { HandlerContext } from "./handler-factory";

/**
 * Mock AWS Lambda context for testing
 */
export function createMockLambdaContext(): LambdaContext {
  return {
    functionName: "test-function",
    functionVersion: "$LATEST",
    invokedFunctionArn: "arn:aws:lambda:us-east-1:123456789012:function:test-function",
    memoryLimitInMB: "512",
    awsRequestId: "test-request-id",
    logGroupName: "/aws/lambda/test-function",
    logStreamName: "2024/01/10/[$LATEST]abcdef",
    callbackWaitsForEmptyEventLoop: true,
    identity: undefined,
    clientContext: undefined,
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

/**
 * Mock API Gateway event for testing
 */
export function createMockAPIGatewayEvent(
  overrides?: Partial<APIGatewayProxyEvent>
): APIGatewayProxyEvent {
  return {
    resource: "/",
    httpMethod: "GET",
    path: "/",
    body: null,
    headers: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {
      resourceId: "123456",
      resourcePath: "/",
      httpMethod: "GET",
      extendedRequestId: "request-id",
      requestTime: new Date().toISOString(),
      path: "/",
      accountId: "123456789012",
      protocol: "HTTP/1.1",
      stage: "dev",
      domainPrefix: "api",
      requestTimeEpoch: Date.now(),
      requestId: "request-id",
      identity: {
        cognitoIdentityPoolId: null,
        cognitoIdentityId: null,
        apiKey: null,
        cognitoAuthenticationType: null,
        cognitoAuthenticationProvider: null,
        userArn: null,
        userAgent: "test-agent",
        user: null,
        sourceIp: "127.0.0.1",
        accessKey: null,
        caller: null,
        apiKeyId: null,
        accountId: null,
      } as any,
      apiId: "api-id",
      domainName: "api.example.com",
    } as any,
    multiValueHeaders: {},
    isBase64Encoded: false,
    ...overrides,
  };
}

/**
 * Mock handler context for testing
 */
export function createMockHandlerContext(
  overrides?: Partial<HandlerContext>
): HandlerContext {
  const { ResponseBuilder } = require("./response-builder");

  return {
    event: createMockAPIGatewayEvent(),
    response: new ResponseBuilder("test-request-id"),
    requestId: "test-request-id",
    ...overrides,
  };
}

/**
 * Test helper to verify response structure
 */
export function assertSuccessResponse(response: any): boolean {
  return (
    response.statusCode &&
    response.body &&
    typeof response.body === "string"
  );
}

/**
 * Test helper to parse response body
 */
export function parseResponseBody(response: any): any {
  if (!response.body) return null;
  try {
    return JSON.parse(response.body);
  } catch {
    return response.body;
  }
}

/**
 * Test helper to create authenticated event
 */
export function createAuthenticatedEvent(token: string): APIGatewayProxyEvent {
  return createMockAPIGatewayEvent({
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Test helper to create event with JSON body
 */
export function createEventWithBody(body: any): APIGatewayProxyEvent {
  return createMockAPIGatewayEvent({
    httpMethod: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Test helper to create event with path parameter
 */
export function createEventWithPathParam(
  param: string,
  value: string
): APIGatewayProxyEvent {
  return createMockAPIGatewayEvent({
    pathParameters: {
      [param]: value,
    },
  });
}

/**
 * Test helper to create event with query parameter
 */
export function createEventWithQueryParam(
  param: string,
  value: string
): APIGatewayProxyEvent {
  return createMockAPIGatewayEvent({
    queryStringParameters: {
      [param]: value,
    },
  });
}
