"""
Pytest configuration and isolated fixtures for CipherVault 2.0.
"""

import os
import pytest
from typing import Generator
from ciphervault.auth.user_store import UserStore


@pytest.fixture
def isolated_user_store(tmp_path) -> Generator[UserStore, None, None]:
    """
    Creates an isolated UserStore pointing to a disposable temporary file.
    Guarantees tests never modify production or default user databases.
    """
    test_db_file = tmp_path / "test_isolated_users.json"
    store = UserStore(db_path=str(test_db_file), require_gmail=True)
    yield store
    # Automatic cleanup is handled by pytest's tmp_path
