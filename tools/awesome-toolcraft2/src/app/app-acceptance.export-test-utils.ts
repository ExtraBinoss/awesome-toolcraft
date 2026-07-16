export function makeBackgroundSection() {
  return {
    controls: {
      includeBackground: {
        defaultValue: true,
        description:
          "Controls preview and PNG background visibility while video keeps the background.",
        label: "Include",
        target: "export.includeBackground",
        type: "switch",
      },
      background: {
        defaultValue: "#0F0F0F",
        label: false,
        target: "appearance.background",
        type: "color",
      },
    },
    layoutGroups: [
      {
        columns: 2,
        controls: ["includeBackground", "background"],
        layout: "inline",
      },
    ],
    title: "Background",
  } as const;
}

export function makeImageExportSection() {
  return {
    controls: {
      imageFormat: {
        defaultValue: "png",
        label: "Format",
        options: [
          { label: "PNG", value: "png" },
          { label: "JPG", value: "jpg" },
        ],
        target: "export.image.format",
        type: "select",
      },
      imageResolution: {
        defaultValue: "4k",
        label: "Resolution",
        options: [
          { label: "2K", value: "2k" },
          { label: "4K", value: "4k" },
          { label: "8K", value: "8k" },
        ],
        target: "export.image.resolution",
        type: "select",
      },
    },
    layoutGroups: [
      {
        columns: 2,
        controls: ["imageFormat", "imageResolution"],
        layout: "inline",
      },
    ],
    title: "Image Export",
  } as const;
}

export function makeVideoExportSection() {
  return {
    controls: {
      videoFormat: {
        defaultValue: "mp4",
        label: "Format",
        options: [
          { label: "MP4", value: "mp4" },
          { label: "WebM", value: "webm" },
        ],
        target: "export.video.format",
        type: "select",
      },
      videoResolution: {
        defaultValue: "current",
        label: "Resolution",
        options: [
          { label: "Current", value: "current" },
          { label: "4K", value: "4k" },
        ],
        target: "export.video.resolution",
        type: "select",
      },
    },
    layoutGroups: [
      {
        columns: 2,
        controls: ["videoFormat", "videoResolution"],
        layout: "inline",
      },
    ],
    title: "Video Export",
  } as const;
}

export function textLooksLikePngExport(text: string): boolean {
  return /\b(export|download)\b/i.test(text) && /\bpng\b|\bimage\b/i.test(text);
}

export function textLooksLikeVideoExport(text: string): boolean {
  return /\b(export|download)\b/i.test(text) && /\b(video|mp4|webm|mov)\b/i.test(text);
}
