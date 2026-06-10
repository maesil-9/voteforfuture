"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  chakra,
  Input,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";

/**
 * 유권자 명부 등록 + 코드 CSV 1회 다운로드 패널.
 * 코드 원문은 이 다운로드에서만 존재한다는 사실을 UI가 끝까지 상기시킨다.
 */
export function VoterBatchUploader({
  electionId,
  structureLocked,
}: {
  electionId: string;
  /** 투표 시작 후 → 기본 등록 금지, 긴급 발급만 허용 */
  structureLocked: boolean;
}) {
  const router = useRouter();
  const [batchName, setBatchName] = useState("");
  const [roster, setRoster] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const rowCount = useMemo(
    () =>
      roster
        .split(/\r?\n/)
        .map((l) => l.split(",")[0].trim())
        .filter(Boolean).length,
    [roster],
  );

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("batchName", batchName);
      form.set("roster", roster);
      if (emergency) form.set("emergency", "on");

      const res = await fetch(`/api/admin/elections/${electionId}/voter-csv`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      // CSV를 즉시 파일로 저장 — 이 순간이 코드 원문을 볼 수 있는 유일한 기회다
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `voter-codes-${batchName || "batch"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setDownloaded(true);
      setBatchName("");
      setRoster("");
      setEmergency(false);
      router.refresh();
    } catch {
      setError("코드 생성 중 문제가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Stack gap={5}>
      {/* 정책 고지 — 요구사항 명시 문구 */}
      <Box
        bg="stamp.100"
        border="1px solid"
        borderColor="stamp.300"
        borderRadius="sm"
        px={4}
        py={3}
      >
        <Text fontSize="sm" color="ink.900" fontWeight={600} whiteSpace="pre-line">
          {`코드 원문은 생성 직후 한 번만 다운로드할 수 있습니다.
이 시스템은 비밀투표를 위해 유권자와 투표 결과를 연결하지 않습니다.
코드 분실 시 기존 코드를 조회할 수 없으며, 별도 추가 코드를 발급해야 합니다.`}
        </Text>
      </Box>

      {structureLocked && (
        <Box bg="paper.100" border="1px dashed" borderColor="sealwax.500" borderRadius="sm" px={4} py={3}>
          <Text fontSize="sm" color="sealwax.700" fontWeight={700}>
            투표가 시작되어 일반 등록이 잠겼습니다. 코드 분실 등 긴급 상황에만
            아래 긴급 발급 옵션을 사용하세요. 모든 긴급 발급은 감사 로그에
            기록됩니다.
          </Text>
        </Box>
      )}

      <Box>
        <chakra.label htmlFor="batch-name" fontSize="sm" fontWeight={700} display="block" mb={1.5}>
          배치 이름
        </chakra.label>
        <Input
          id="batch-name"
          value={batchName}
          onChange={(e) => setBatchName(e.target.value)}
          placeholder="예: 1차 명부 (정회원)"
          bg="bg.surface"
          maxW="md"
        />
      </Box>

      <Box>
        <chakra.label htmlFor="roster" fontSize="sm" fontWeight={700} display="block" mb={1.5}>
          유권자 명부 (한 줄에 한 명 — 닉네임[, 메모])
        </chakra.label>
        <Textarea
          id="roster"
          value={roster}
          onChange={(e) => setRoster(e.target.value)}
          placeholder={"침착한곰, 방 개설 멤버\n조용한달팽이\n새벽커피"}
          rows={8}
          bg="bg.surface"
          fontFamily="mono"
          fontSize="sm"
        />
        <Text mt={1.5} fontSize="xs" color="fg.muted">
          명부 미리보기: <strong>{rowCount}</strong>명 — 닉네임/메모는 코드
          발급에만 잠시 사용되며 서버에 저장되지 않습니다.
        </Text>
      </Box>

      {structureLocked && (
        <Box as="label" display="flex" alignItems="center" gap={2} cursor="pointer">
          <input
            type="checkbox"
            checked={emergency}
            onChange={(e) => setEmergency(e.target.checked)}
          />
          <Text fontSize="sm" fontWeight={600} color="sealwax.700">
            긴급 추가 코드 발급으로 진행합니다 (감사 로그 기록)
          </Text>
        </Box>
      )}

      {error && (
        <Text role="alert" fontSize="sm" color="sealwax.700" fontWeight={600}>
          {error}
        </Text>
      )}
      {downloaded && !error && (
        <Text fontSize="sm" color="booth.600" fontWeight={700}>
          CSV가 다운로드되었습니다. 이 파일은 다시 받을 수 없으니 안전하게
          보관·전달하세요.
        </Text>
      )}

      <Button
        onClick={handleGenerate}
        disabled={busy || rowCount === 0 || !batchName.trim() || (structureLocked && !emergency)}
        loading={busy}
        loadingText="코드 생성 중…"
        bg="booth.600"
        color="paper.50"
        _hover={{ bg: "booth.700" }}
        fontWeight={700}
        alignSelf="flex-start"
      >
        코드 생성 + CSV 다운로드 (1회)
      </Button>
    </Stack>
  );
}
