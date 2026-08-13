import React from "react";
import { Upload } from "lucide-react";
import { Dataset } from "../../shared/types";

interface Props {
  title: string;
  dataset: Dataset | null;
  onChoose: () => void;
}

export default function UploadCard({ title, dataset, onChoose }: Props) {
  return (
    <div className="upload-card">
      <div className="upload-icon"><Upload size={19}/></div>
      <div className="upload-copy">
        <h3>{title}</h3>
        <p>
          {dataset
            ? `${dataset.name} • ${dataset.rows.toLocaleString()} rows • ${dataset.columns.length} columns`
            : "CSV or XLSX dataset"}
        </p>
      </div>
      <button className="secondary" onClick={onChoose}>
        {dataset ? "Replace" : "Browse"}
      </button>
    </div>
  );
}
