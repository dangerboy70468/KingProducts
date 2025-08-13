import { Request, Response, NextFunction } from 'express';

export type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any> | any;
export type RouterHandler = (path: string, ...handlers: RequestHandler[]) => void;

export interface TypedRequest<T = any> extends Request {
  body: T;
}
