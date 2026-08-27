export type ValidationResult<T> = { value: T } | { error: string };

export function requireNonNegativeNumber(
	raw: string,
	errorMessage: string,
): ValidationResult<number> {
	const value = Number(raw);
	if (!Number.isFinite(value) || value < 0) {
		return { error: errorMessage };
	}
	return { value };
}

export function optionalPositiveNumber(
	raw: string,
	errorMessage: string,
): { value: number | null; error?: string } {
	const trimmed = raw.trim();
	if (!trimmed) {
		return { value: null };
	}

	const value = Number(trimmed);
	if (!Number.isFinite(value) || value <= 0) {
		return { value: null, error: errorMessage };
	}

	return { value };
}

export function requirePositiveNumber(raw: string, errorMessage: string): ValidationResult<number> {
	const value = Number(raw);
	if (!Number.isFinite(value) || value <= 0) {
		return { error: errorMessage };
	}
	return { value };
}

export function getValidatedValue<T>(
	validation: ValidationResult<T>,
	onError: (message: string) => void,
): T | null {
	if ('error' in validation) {
		onError(validation.error);
		return null;
	}

	return validation.value;
}
