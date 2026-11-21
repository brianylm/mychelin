import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

const noop = vi.fn();

describe("ConfirmDialog", () => {
  it("renders nothing while closed", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog open={false} title="Delete?" onConfirm={noop} onCancel={noop} />
    );
    expect(html).toBe("");
  });

  it("renders title, message and labelled actions with danger styling", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog
        open
        title="Delete Pho?"
        message="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={noop}
        onCancel={noop}
      />
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain("Delete Pho?");
    expect(html).toContain("This cannot be undone.");
    expect(html).toContain("Cancel");
    expect(html).toContain("text-ui-danger");
  });
});
