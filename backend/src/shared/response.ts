import { Response } from 'express';
import { IApiResponse } from './types/api';

export const sendResponse = <T = any>(
  res: Response<IApiResponse<T>>,
  statusCode: number,
  success: boolean,
  message: string,
  data: T | null = null
) => {
  const responseData: IApiResponse<T> = {
    success,
    message,
    data: data as T,
  };
  return res.status(statusCode).json(responseData);
};
