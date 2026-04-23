"use client";

import { useId, useState, useTransition } from "react";

import { Field, formGridClassName, inputClassName } from "@/components/clinic/ui";

const MAX_UPLOAD_SIZE_MB = 4;
const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.82;

async function compressImage(file: File) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Solo puedes subir imagenes.");
  }

  const imageUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("No se pudo procesar la imagen."));
      element.src = imageUrl;
    });

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("No se pudo preparar la compresion de la imagen.");
    }

    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) {
          resolve(value);
        } else {
          reject(new Error("No se pudo comprimir la imagen."));
        }
      }, "image/jpeg", JPEG_QUALITY);
    });

    const baseName = file.name.replace(/\.[^.]+$/, "") || "imagen";

    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function formatFileSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function assignFileToInput(input: HTMLInputElement, file: File) {
  const transfer = new DataTransfer();
  transfer.items.add(file);
  input.files = transfer.files;
}

function ImageUploadField({
  label,
  inputName,
}: {
  label: string;
  inputName: string;
}) {
  const hintId = useId();
  const [message, setMessage] = useState("Se comprimira automaticamente antes de subir.");
  const [isPending, startTransition] = useTransition();

  return (
    <Field
      label={label}
      hint={isPending ? "Comprimiendo imagen..." : message}
    >
      <input
        name={inputName}
        type="file"
        accept="image/*"
        aria-describedby={hintId}
        className={inputClassName}
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];

          if (!file) {
            setMessage("Se comprimira automaticamente antes de subir.");
            return;
          }

          startTransition(async () => {
            try {
              const compressedFile = await compressImage(file);

              if (compressedFile.size > MAX_UPLOAD_SIZE_BYTES) {
                input.value = "";
                setMessage(`La imagen final supera ${MAX_UPLOAD_SIZE_MB} MB. Usa una foto mas ligera.`);
                return;
              }

              assignFileToInput(input, compressedFile);
              setMessage(
                `Lista para subir: ${formatFileSize(compressedFile.size)} despues de comprimir.`,
              );
            } catch (error) {
              input.value = "";
              setMessage(error instanceof Error ? error.message : "No se pudo preparar la imagen.");
            }
          });
        }}
      />
      <span id={hintId} className="sr-only">
        {message}
      </span>
    </Field>
  );
}

export function PatientFollowUpImageFields() {
  return (
    <div className={formGridClassName}>
      <ImageUploadField label="Foto antes" inputName="beforeImageFile" />
      <ImageUploadField label="Foto despues" inputName="afterImageFile" />
    </div>
  );
}
