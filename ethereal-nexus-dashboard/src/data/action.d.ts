export type Result<T> = {
    success: true
    data: T
  }
  | {
  success: false,
  error: ActionError
}

type ActionError = {
  message: string;
  issues?: {
    message: string;
    path: (string | number)[]
  }[]
}