"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Flex, Stack, Text } from "@chakra-ui/react";
import {
  ALLOWED_IMAGE_MIME,
  MAX_UPLOAD_BYTES,
} from "@/server/services/upload";

type UploadStatus = "idle" | "uploading" | "done" | "error";

/**
 * 진행률 표시 업로드 필드.
 * XHR upload.onprogress로 실제 전송 진행률을 프로그레스바에 보여주고,
 * 완료 시 화면을 새로고침해 업로드 결과(미리보기)를 반영한다.
 */
export function UploadField({
  endpoint,
  buttonLabel = "업로드",
  hint = "JPEG/PNG/WebP/GIF · 3MB 이하",
}: {
  /** 파일을 POST할 라우트 (FormData field: "file") */
  endpoint: string;
  buttonLabel?: string;
  hint?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setMessage(null);
    setStatus("idle");
    setProgress(0);

    if (selected && selected.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setStatus("error");
      setMessage("이미지는 3MB 이하만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }
    if (selected && !ALLOWED_IMAGE_MIME.includes(selected.type)) {
      setFile(null);
      setStatus("error");
      setMessage("JPEG/PNG/WebP/GIF 이미지만 업로드할 수 있습니다.");
      e.target.value = "";
      return;
    }
    setFile(selected);
  }

  function handleUpload() {
    if (!file || status === "uploading") return;

    setStatus("uploading");
    setProgress(0);
    setMessage(null);

    const form = new FormData();
    form.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        setStatus("done");
        setMessage("업로드 완료!");
        setFile(null);
        if (inputRef.current) inputRef.current.value = "";
        router.refresh();
      } else {
        setStatus("error");
        try {
          setMessage(JSON.parse(xhr.responseText).message ?? "업로드에 실패했습니다.");
        } catch {
          setMessage("업로드에 실패했습니다. 다시 시도해주세요.");
        }
      }
    };

    xhr.onerror = () => {
      setStatus("error");
      setMessage("네트워크 문제로 업로드에 실패했습니다. 다시 시도해주세요.");
    };

    xhr.send(form);
  }

  return (
    <Stack gap={2} maxW="320px">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_IMAGE_MIME.join(",")}
        onChange={handleSelect}
        disabled={status === "uploading"}
        style={{ fontSize: "12px" }}
        aria-label="업로드할 이미지 선택"
      />

      {/* 프로그레스바 */}
      {status === "uploading" && (
        <Box>
          <Box
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="업로드 진행률"
            h="8px"
            bg="paper.200"
            borderRadius="full"
            border="1px solid"
            borderColor="paper.300"
            overflow="hidden"
          >
            <Box
              h="100%"
              w={`${progress}%`}
              bg="booth.600"
              borderRadius="full"
              transition="width 0.2s ease"
            />
          </Box>
          <Text mt={1} fontSize="xs" color="fg.muted" textAlign="right">
            {progress}%
          </Text>
        </Box>
      )}

      {message && (
        <Text
          role={status === "error" ? "alert" : "status"}
          fontSize="xs"
          fontWeight={700}
          color={status === "error" ? "sealwax.700" : "booth.600"}
        >
          {message}
        </Text>
      )}

      <Flex>
        <Button
          type="button"
          onClick={handleUpload}
          disabled={!file || status === "uploading"}
          loading={status === "uploading"}
          loadingText={`업로드 중… ${progress}%`}
          size="xs"
          bg="booth.600"
          color="paper.50"
          _hover={{ bg: "booth.700" }}
          fontWeight={700}
        >
          {buttonLabel}
        </Button>
      </Flex>

      <Text fontSize="2xs" color="fg.subtle">
        {hint}
      </Text>
    </Stack>
  );
}
