from langchain_community.document_loaders import PyPDFLoader
from langchain_core.documents import Document as LCDocument

from app.utils.exceptions import DocumentProcessingError


def load_pdf(file_path: str) -> list[LCDocument]:
    try:
        loader = PyPDFLoader(file_path)
        return loader.load()
    except Exception as exc:  # noqa: BLE001 - surface any parser failure uniformly
        raise DocumentProcessingError(f"Failed to load PDF '{file_path}': {exc}") from exc
