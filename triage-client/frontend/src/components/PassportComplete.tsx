import { imageDataToUrl } from "@/utils/helpers";
import Image from "next/image";

interface PassportCompleteProps {
  data: {
    json: unknown;
    images: Record<string, string>;
  };
}

export default function PassportComplete({ data }: PassportCompleteProps) {
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Data Uploaded</h2>
      <pre style={styles.codeBlock}>{JSON.stringify(data.json, null, 2)}</pre>
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
} as const;
