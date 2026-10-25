/**
 * CipherVault 2.0 - Core Cryptographic Constants.
 */

export const MAGIC_BYTES = "CVLT";
export const FORMAT_VERSION = 1;
export const DEFAULT_KDF_ITERATIONS = 600000;
export const MIN_HEADER_SIZE = 93;

// 92-character custom alphabet for educational Module A
export const CHARSET =
  " !#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[]^_abcdefghijklmnopqrstuvwxyz{|}~";

export const CHARSET_LENGTH = CHARSET.length; // 92
