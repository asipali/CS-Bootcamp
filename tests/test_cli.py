"""
Tests for CLI Entry Point and Arguments.
"""

from ciphervault.cli import main, run_self_tests


def test_cli_self_test_runner():
    """Verify in-process self-test runner exits with code 0."""
    status = run_self_tests()
    assert status == 0


def test_cli_main_test_flag(capsys):
    """Verify main(['--test']) exits cleanly with status 0."""
    status = main(["--test"])
    assert status == 0
    captured = capsys.readouterr()
    assert "CIPHERVAULT 2.0" in captured.out
    assert "Self-Test Summary" in captured.out


def test_cli_main_demo_flag(capsys):
    """Verify main(['--demo']) displays educational demonstrations."""
    status = main(["--demo"])
    assert status == 0
    captured = capsys.readouterr()
    assert "Educational Cipher Demonstrations" in captured.out
    assert "Caesar" in captured.out
    assert "Substitution" in captured.out
    assert "Shuffle" in captured.out
