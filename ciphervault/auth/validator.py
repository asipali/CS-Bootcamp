"""
CipherVault 2.0 - Input Validation & Sanitization Module.

Handles validation for registration fields: username, email, mobile number, and password.
Follows strict non-modifying rules: intentional whitespace in passwords is preserved.
"""

import re
from typing import Optional


class ValidationError(ValueError):
    """Raised when user registration or profile input fails validation checks."""
    pass


class UserValidator:
    """
    Validates user credentials and registration inputs according to defined security policies.
    """

    MIN_PASSWORD_LENGTH: int = 8
    MOBILE_REGEX = re.compile(r"^[0-9]{10}$")
    EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

    @classmethod
    def validate_username(cls, username: str) -> str:
        """
        Validates and cleans username.
        Must be between 3 and 30 characters, alphanumeric with underscores/hyphens.
        """
        if not isinstance(username, str):
            raise ValidationError("Username must be a string.")
        trimmed = username.strip()
        if len(trimmed) < 3 or len(trimmed) > 30:
            raise ValidationError("Username must be between 3 and 30 characters in length.")
        if not re.match(r"^[a-zA-Z0-9_-]+$", trimmed):
            raise ValidationError("Username may only contain letters, numbers, underscores, and hyphens.")
        return trimmed

    @classmethod
    def validate_email(cls, email: str, require_gmail: bool = False) -> str:
        """
        Validates email format and normalizes domain to lowercase.
        If require_gmail is True, requires the domain to be gmail.com.
        """
        if not isinstance(email, str):
            raise ValidationError("Email must be a string.")
        cleaned = email.strip()
        if not cls.EMAIL_REGEX.match(cleaned):
            raise ValidationError("Invalid email address format.")

        parts = cleaned.split("@")
        local_part = parts[0]
        domain_part = parts[1].lower()

        if require_gmail and domain_part != "gmail.com":
            raise ValidationError("Only valid Gmail addresses (@gmail.com) are accepted by system policy.")

        return f"{local_part}@{domain_part}"

    @classmethod
    def validate_mobile(cls, mobile: str) -> str:
        """
        Validates 10-digit mobile phone number.
        """
        if not isinstance(mobile, str):
            raise ValidationError("Mobile number must be a string.")
        cleaned = mobile.strip()
        if not cls.MOBILE_REGEX.match(cleaned):
            raise ValidationError("Mobile number must be exactly 10 numeric digits.")
        return cleaned

    @classmethod
    def validate_password(cls, password: str) -> str:
        """
        Validates password strength.

        CRITICAL SECURITY RULE:
        Never call `.strip()` on passwords. Leading and trailing spaces are valid
        entropy characters intentionally chosen by users.
        """
        if not isinstance(password, str):
            raise ValidationError("Password must be a string.")
        if len(password) < cls.MIN_PASSWORD_LENGTH:
            raise ValidationError(
                f"Password must be at least {cls.MIN_PASSWORD_LENGTH} characters in length."
            )
        if len(password) > 256:
            raise ValidationError("Password exceeds maximum supported length (256 characters).")
        return password
