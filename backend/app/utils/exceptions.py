class SharkIQError(Exception):
    """Base application error. Carries an HTTP-friendly status code."""

    status_code: int = 400

    def __init__(self, message: str, status_code: int | None = None):
        super().__init__(message)
        self.message = message
        if status_code is not None:
            self.status_code = status_code


class NotFoundError(SharkIQError):
    status_code = 404


class ValidationFailedError(SharkIQError):
    status_code = 422


class DocumentProcessingError(SharkIQError):
    status_code = 422


class WorkflowError(SharkIQError):
    status_code = 500


class WorkflowNotInterruptedError(SharkIQError):
    status_code = 409


class UnauthorizedError(SharkIQError):
    status_code = 401
