"use client";

import { useRef, useState } from "react";
import type { NodeViewProps } from "@tiptap/react";
import { NodeViewWrapper } from "@tiptap/react";
import { focusNextNode, isValidPosition } from "src/lib/tiptap-utils";
import { UrlTab } from "src/components/tiptap-ui/cover/url-tab";
import { UploadTab } from "src/components/tiptap-ui/cover/upload-tab";
import { UnsplashTab } from "src/components/tiptap-ui/cover/unsplash-tab";
import { useFileUpload } from "./use-file-upload";
import type { UploadOptions } from "./image-upload-node";

type Tab = "upload" | "url" | "photos";

const TAB_LIST: { id: Tab; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "url", label: "URL" },
  { id: "photos", label: "Photos" },
];

const tabBarStyle: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid var(--tt-border-color)",
  marginBottom: 12,
};

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: "7px 0",
  fontSize: 13,
  fontWeight: active ? 500 : 400,
  color: active ? "var(--tt-theme-text)" : "var(--tt-text-color)",
  background: "none",
  border: "none",
  borderBottom: `2px solid ${active ? "var(--tt-brand-color-500)" : "transparent"}`,
  cursor: "pointer",
  transition: "color 0.15s, border-color 0.15s",
  marginBottom: -1,
});

export const ImageUploadNodeView: React.FC<NodeViewProps> = (props) => {
  const { accept, limit, maxSize } = props.node.attrs;
  const extension = props.extension;
  const inputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>("upload");

  const uploadOptions: UploadOptions = {
    maxSize,
    limit,
    accept,
    upload: extension.options.upload,
    onSuccess: extension.options.onSuccess,
    onError: extension.options.onError,
  };

  const { uploadFiles } = useFileUpload(uploadOptions);

  const insertImages = (urls: string[], files?: File[]) => {
    const pos = props.getPos();
    if (!isValidPosition(pos)) return;

    const replaceAttrs = props.node.attrs._replaceAttrs ?? {};

    const imageNodes = urls.map((url, i) => ({
      type: "image",
      attrs: {
        ...replaceAttrs,
        src: url,
        alt:
          replaceAttrs.alt ?? files?.[i]?.name.replace(/\.[^/.]+$/, "") ?? "",
      },
    }));

    props.editor
      .chain()
      .focus()
      .deleteRange({ from: pos, to: pos + props.node.nodeSize })
      .insertContentAt(pos, imageNodes)
      .run();

    focusNextNode(props.editor);
  };

  const handleFiles = async (files: File[]) => {
    const urls = await uploadFiles(files);
    if (urls.length > 0) insertImages(urls, files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) {
      extension.options.onError?.(new Error("No file selected"));
      return;
    }
    handleFiles(files);
  };

  return (
    <NodeViewWrapper>
      <div
        style={{
          border: "1px solid var(--tt-border-color)",
          borderRadius: "var(--tt-radius-lg)",
          background: "var(--tt-card-bg-color)",
          padding: "12px 14px 14px",
          width: "100%",
          maxWidth: 380,
        }}
      >
        <div style={tabBarStyle}>
          {TAB_LIST.map(({ id, label }) => (
            <button
              key={id}
              style={tabBtnStyle(tab === id)}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "upload" && (
          <UploadTab
            // onSelect={(url) => insertImages([url])}
            onFiles={handleFiles}
            inputRef={inputRef}
          />
        )}
        {tab === "url" && <UrlTab onSelect={(url) => insertImages([url])} />}
        {tab === "photos" && (
          <UnsplashTab onSelect={(url) => insertImages([url])} />
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={limit > 1}
          style={{ display: "none" }}
          onChange={handleFileInput}
          onClick={(e: React.MouseEvent<HTMLInputElement>) =>
            e.stopPropagation()
          }
        />
      </div>
    </NodeViewWrapper>
  );
};
