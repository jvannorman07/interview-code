import ExtendableError from 'es6-error'

export default class AppError<CodeType> extends ExtendableError {
  code: CodeType
  info: Object | undefined

  constructor(code: CodeType, message: string, info?: Object) {
    super(message)
    this.code = code
    this.info = info
  }

  toString() {
    return `Error [${this.code}]: ${this.message}`
  }
}
