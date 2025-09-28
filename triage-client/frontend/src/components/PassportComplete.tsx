import { imageDataToUrl } from "@/utils/helpers";
import Image from "next/image";
import type { PassportAttachment, PassportBundle, MedicalData } from "@/utils/types";
import MedicalDataDisplay from "./MedicalDataDisplay";

interface PassportCompleteProps {
  data: PassportBundle;
}

function formatCapturedAt(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatSize(size?: number) {
  if (typeof size !== "number") return undefined;
  if (!Number.isFinite(size)) return `${size}`;
  const kb = size / 1024;
  if (kb >= 1024) {
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB (${size.toLocaleString()} bytes)`;
  }
  return `${kb.toFixed(1)} KB (${size.toLocaleString()} bytes)`;
}

function renderMetaRow(label: string, value?: string) {
  if (!value) return null;
  return (
    <div style={styles.metaRow}>
      <span style={styles.metaLabel}>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function AttachmentCard({
  attachment,
  imageBase64,
}: {
  attachment: PassportAttachment;
  imageBase64?: string;
}) {
  return (
    <div style={styles.attachmentCard}>
      {imageBase64 ? (
        <Image
          src={imageDataToUrl(imageBase64)}
          alt={attachment.context?.description || attachment.filename}
          width={600}
          height={400}
          style={{ width: "100%", height: "auto", borderRadius: 12 }}
        />
      ) : (
        <div style={styles.missingImage}>Image data unavailable</div>
      )}

      <div style={styles.metaSection}>
        <h4 style={styles.metaHeading}>
          {attachment.context?.ogFileName || attachment.filename}
        </h4>
        {renderMetaRow("File", attachment.filename)}
        {renderMetaRow("Type", attachment.mime)}
        {renderMetaRow("Captured", formatCapturedAt(attachment.capturedAt))}
        {renderMetaRow("Size", formatSize(attachment.size))}
        {renderMetaRow("Source", attachment.context?.source)}
        {renderMetaRow("Description", attachment.context?.description)}
        {attachment.context?.tags?.length ? (
          <div style={styles.metaRow}>
            <span style={styles.metaLabel}>Tags</span>
            <div style={styles.tagList}>
              {attachment.context.tags.map((tag) => (
                <span key={tag} style={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PassportComplete({ data }: PassportCompleteProps) {
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Medical Records</h2>
  <MedicalDataDisplay data={data.json as MedicalData} />
      {data.attachments.length > 0 ? (
        <div style={styles.attachmentsSection}>
          <h3 style={styles.subheading}>Uploaded Attachments</h3>
          <div style={styles.imageGrid}>
            {data.attachments.map((attachment) => (
              <AttachmentCard
                key={attachment.id || attachment.filename}
                attachment={attachment}
                imageBase64={data.images[attachment.filename]}
              />
            ))}
          </div>
        </div>
      ) : (
        <div style={styles.imageGrid}>
          {Object.entries(data.images).map(([filename, base64]) => (
            <div key={filename} style={styles.imageContainer}>
              <Image
                src={imageDataToUrl(base64)}
                alt={filename}
                width={600}
                height={400}
                style={{ width: "100%", height: "auto" }}
              />
              <p style={styles.filename}>{filename}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "16px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  heading: {
    fontSize: "1.25rem",
    fontWeight: "600",
    margin: 0,
  },
  codeBlock: {
    backgroundColor: "#f3f4f6",
    padding: "8px",
    borderRadius: "4px",
    fontSize: "0.875rem",
    overflow: "auto",
    fontFamily: "monospace",
  },
  imageGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "16px",
  },
  imageContainer: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
  },
  image: {
    maxWidth: "100%",
    height: "auto",
    borderRadius: "4px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  filename: {
    fontSize: "0.75rem",
    marginTop: "4px",
    margin: 0,
    textAlign: "center" as const,
  },
  attachmentsSection: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  subheading: {
    fontSize: "1.1rem",
    margin: 0,
  },
  attachmentCard: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px",
    background: "#fff",
  },
  metaSection: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "6px",
  },
  metaHeading: {
    margin: 0,
    fontSize: "1rem",
    fontWeight: 600,
  },
  metaRow: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "2px",
    fontSize: "0.85rem",
    color: "#334155",
  },
  metaLabel: {
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#64748b",
  },
  tagList: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
  },
  tag: {
    background: "#e0f2fe",
    color: "#0369a1",
    padding: "2px 8px",
    borderRadius: "999px",
    fontSize: "0.75rem",
  },
  missingImage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "12px",
    border: "1px dashed #cbd5f5",
    minHeight: "180px",
    color: "#475569",
    background: "#f8fafc",
  },
} as const;