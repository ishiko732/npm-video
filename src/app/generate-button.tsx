"use client";

import type {Props} from "@/video/schema";

import {Button, Spinner} from "@heroui/react";
import {readableColor} from "color2k";
import {useEffect, useRef, useState} from "react";

import {
  NpmDownloadsComposition,
  animationDurationInSeconds,
  fps,
  height,
  width,
} from "@/video/composition";
import {defaultProps, schema} from "@/video/schema";

export function GenerateButton({
  inputProps,
  primaryColor,
}: {
  inputProps?: Partial<Props>;
  primaryColor?: string;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [download, setDownload] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(
    () => () => {
      if (download) URL.revokeObjectURL(download);
    },
    [download],
  );
  useEffect(() => {
    controller.current?.abort();
    controller.current = null;
    setProgress(null);
    setDownload(null);
    setError(null);
  }, [inputProps]);

  const filename = `${(inputProps?.packageName ?? "npm-package").replace(/[^a-zA-Z0-9._-]/g, "-")}.mp4`;

  return (
    <div className="flex flex-col gap-3">
      <Button
        isDisabled={!inputProps || progress !== null}
        style={
          primaryColor
            ? {backgroundColor: primaryColor, color: readableColor(primaryColor)}
            : undefined
        }
        onPress={async () => {
          if (controller.current) return;
          const abort = new AbortController();
          controller.current = abort;
          setProgress(0);
          setError(null);
          setDownload(null);
          try {
            const {canRenderMediaOnWeb, renderMediaOnWeb} = await import("@remotion/web-renderer");
            const props = schema.parse({...defaultProps, ...inputProps});
            const composition = {
              id: "NpmDownloads",
              defaultProps: props,
              component: NpmDownloadsComposition,
              durationInFrames: (animationDurationInSeconds + 1) * fps,
              fps,
              width,
              height,
            };
            const support = await canRenderMediaOnWeb({
              width,
              height,
              container: "mp4",
              videoCodec: "h264",
              muted: true,
            });
            if (!support.canRender)
              throw new Error(
                "This browser cannot export MP4. Try an updated Chrome, Edge or Safari.",
              );
            const result = await renderMediaOnWeb({
              composition,
              inputProps: props,
              container: "mp4",
              videoCodec: "h264",
              muted: true,
              signal: abort.signal,
              onProgress: ({progress: value}) => {
                if (!abort.signal.aborted) setProgress(Math.round(value * 100));
              },
            });
            const blob = await result.getBlob();
            if (!abort.signal.aborted) setDownload(URL.createObjectURL(blob));
          } catch (err) {
            if (!abort.signal.aborted)
              setError(
                err instanceof Error ? err.message : "Video export failed. Please try again.",
              );
          } finally {
            if (controller.current === abort) {
              controller.current = null;
              setProgress(null);
            }
          }
        }}
      >
        {progress !== null ? (
          <>
            <Spinner color="current" size="sm" /> Rendering {progress}%
          </>
        ) : (
          "Export MP4 video"
        )}
      </Button>
      {progress !== null && (
        <Button variant="outline" onPress={() => controller.current?.abort()}>
          Cancel export
        </Button>
      )}
      {download && (
        <a className="text-center underline" href={download} download={filename}>
          Download MP4
        </a>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger break-words">
          {error}
        </p>
      )}
    </div>
  );
}
