import { RegistryProvider } from "@effect-atom/atom-react";
import { ReactElement } from "react";

/**
 * Test wrapper that provides the atom registry context
 * Use this to wrap components in tests that use atoms
 */
export function TestWrapper({ children }: { children: ReactElement }) {
	return <RegistryProvider>{children}</RegistryProvider>;
}

/**
 * Helper function to render components with atom registry context
 * Use this instead of render() for components that use atoms
 */
export function renderWithAtoms(
	ui: ReactElement,
	options?: Parameters<typeof import("@testing-library/react").render>[1],
) {
	const { render } = require("@testing-library/react");
	return render(<TestWrapper>{ui}</TestWrapper>, options);
}
