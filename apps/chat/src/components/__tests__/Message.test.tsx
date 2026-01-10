import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageComponent } from "../Message";
import { createTestMessage } from "../../__tests__/fixtures/test-data";

describe("MessageComponent", () => {
	it("should render user message with correct styling", () => {
		const message = createTestMessage({
			role: "user",
			content: "Hello, world!",
		});

		render(<MessageComponent message={message} />);

		const messageElement = screen.getByText("Hello, world!");
		expect(messageElement).toBeInTheDocument();

		// Check that it's in a container with user message styling
		const container = messageElement.closest(".bg-blue-100");
		expect(container).toBeInTheDocument();
	});

	it("should render assistant message with correct styling", () => {
		const message = createTestMessage({
			role: "assistant",
			content: "Hi there!",
		});

		render(<MessageComponent message={message} />);

		const messageElement = screen.getByText("Hi there!");
		expect(messageElement).toBeInTheDocument();

		// Check that it's in a container with assistant message styling
		const container = messageElement.closest(".bg-gray-100");
		expect(container).toBeInTheDocument();
	});

	it("should render system message with correct styling", () => {
		const message = createTestMessage({
			role: "system",
			content: "System notification",
		});

		render(<MessageComponent message={message} />);

		const messageElement = screen.getByText("System notification");
		expect(messageElement).toBeInTheDocument();

		// Check that it's in a container with system message styling
		const container = messageElement.closest(".bg-gray-200");
		expect(container).toBeInTheDocument();
	});

	it("should render markdown for assistant messages", () => {
		const message = createTestMessage({
			role: "assistant",
			content: "This is **bold** text",
		});

		render(<MessageComponent message={message} />);

		// react-markdown should render the markdown
		// Check that bold text is rendered
		expect(screen.getByText("bold")).toBeInTheDocument();
		expect(screen.getByText(/This is.*text/)).toBeInTheDocument();
	});

	it("should render markdown for system messages", () => {
		const message = createTestMessage({
			role: "system",
			content: "System **message**",
		});

		render(<MessageComponent message={message} />);

		expect(screen.getByText("System")).toBeInTheDocument();
	});

	it("should render plain text for user messages", () => {
		const message = createTestMessage({
			role: "user",
			content: "This is **not** markdown",
		});

		render(<MessageComponent message={message} />);

		// User messages should render as plain text, not markdown
		expect(screen.getByText("This is **not** markdown")).toBeInTheDocument();
	});

	it("should display timestamp", () => {
		const timestamp = Date.now();
		const message = createTestMessage({
			role: "user",
			content: "Test message",
			timestamp,
		});

		render(<MessageComponent message={message} />);

		// Timestamp should be formatted - check that the formatted time string exists
		const formattedTime = new Date(timestamp).toLocaleTimeString();
		expect(
			screen.getByText((content, element) => {
				return element?.textContent === formattedTime || false;
			}),
		).toBeInTheDocument();
	});

	it("should render code blocks in assistant messages", () => {
		const message = createTestMessage({
			role: "assistant",
			content: "```\nconst x = 1;\n```",
		});

		render(<MessageComponent message={message} />);

		// Code should be rendered (exact structure depends on react-markdown)
		expect(screen.getByText("const x = 1;")).toBeInTheDocument();
	});

	it("should render inline code in assistant messages", () => {
		const message = createTestMessage({
			role: "assistant",
			content: "Use `console.log()` to debug",
		});

		render(<MessageComponent message={message} />);

		// Inline code should be rendered
		expect(screen.getByText("console.log()")).toBeInTheDocument();
	});

	it("should align user messages to the right", () => {
		const message = createTestMessage({
			role: "user",
			content: "Right aligned",
		});

		const { container } = render(<MessageComponent message={message} />);

		const messageContainer = container.querySelector(".justify-end");
		expect(messageContainer).toBeInTheDocument();
	});

	it("should align assistant messages to the left", () => {
		const message = createTestMessage({
			role: "assistant",
			content: "Left aligned",
		});

		const { container } = render(<MessageComponent message={message} />);

		const messageContainer = container.querySelector(".justify-start");
		expect(messageContainer).toBeInTheDocument();
	});

	it("should align system messages to the left", () => {
		const message = createTestMessage({
			role: "system",
			content: "System message",
		});

		const { container } = render(<MessageComponent message={message} />);

		const messageContainer = container.querySelector(".justify-start");
		expect(messageContainer).toBeInTheDocument();
	});

	it("should handle empty content", () => {
		const message = createTestMessage({ role: "user", content: "" });

		render(<MessageComponent message={message} />);

		// Component should render without crashing
		expect(
			screen.getByText((content, element) => {
				return element?.tagName === "P" && element?.textContent === "";
			}),
		).toBeInTheDocument();
	});

	it("should handle long content", () => {
		const longContent = "a".repeat(1000);
		const message = createTestMessage({ role: "user", content: longContent });

		render(<MessageComponent message={message} />);

		expect(screen.getByText(longContent)).toBeInTheDocument();
	});

	it("should handle special characters in content", () => {
		const specialContent = 'Hello <world> & "quotes"';
		const message = createTestMessage({
			role: "user",
			content: specialContent,
		});

		render(<MessageComponent message={message} />);

		expect(screen.getByText(specialContent)).toBeInTheDocument();
	});
});
