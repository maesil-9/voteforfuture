"use client";

import { Box, Grid, Input, NativeSelect, chakra, Textarea } from "@chakra-ui/react";
import { ActionForm } from "./ActionForm";
import { saveElectionAction } from "@/server/actions/admin";
import { toDatetimeLocalValue } from "@/lib/format";
import type { Election } from "@/server/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "draft — 작성 중 (비공개)",
  scheduled: "scheduled — 공고됨 (투표 전)",
  open: "open — 투표 진행",
  closed: "closed — 투표 종료",
  archived: "archived — 보관 (읽기 전용)",
};

export function ElectionForm({ election }: { election?: Election }) {
  return (
    <ActionForm
      action={saveElectionAction}
      submitLabel={election ? "변경사항 저장" : "선거 만들기"}
    >
      {election && <input type="hidden" name="id" value={election.id} />}

      <Field label="선거명" htmlFor="el-title">
        <Input
          id="el-title"
          name="title"
          required
          defaultValue={election?.title ?? "[침착한 일상 이야기방] 방장 선거"}
          bg="bg.surface"
        />
      </Field>

      <Field label="소개 / 공고문" htmlFor="el-desc">
        <Textarea
          id="el-desc"
          name="description"
          rows={3}
          defaultValue={election?.description ?? ""}
          bg="bg.surface"
        />
      </Field>

      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
        <Field label="투표 시작" htmlFor="el-starts">
          <Input
            id="el-starts"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={election ? toDatetimeLocalValue(election.startsAt) : ""}
            bg="bg.surface"
          />
        </Field>
        <Field label="투표 종료" htmlFor="el-ends">
          <Input
            id="el-ends"
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={election ? toDatetimeLocalValue(election.endsAt) : ""}
            bg="bg.surface"
          />
        </Field>
        <Field label="결과 발표" htmlFor="el-result">
          <Input
            id="el-result"
            name="resultVisibleAt"
            type="datetime-local"
            required
            defaultValue={
              election ? toDatetimeLocalValue(election.resultVisibleAt) : ""
            }
            bg="bg.surface"
          />
        </Field>
      </Grid>

      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
        <Field label="상태" htmlFor="el-status">
          <NativeSelect.Root bg="bg.surface">
            <NativeSelect.Field
              id="el-status"
              name="status"
              defaultValue={election?.status ?? "draft"}
            >
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect.Field>
            <NativeSelect.Indicator />
          </NativeSelect.Root>
        </Field>
        <Field label="예상 유권자 수 (참고용)" htmlFor="el-max">
          <Input
            id="el-max"
            name="maxVoters"
            type="number"
            min={0}
            defaultValue={election?.maxVoters ?? 0}
            bg="bg.surface"
          />
        </Field>
      </Grid>
    </ActionForm>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <chakra.label htmlFor={htmlFor} fontSize="sm" fontWeight={700} display="block" mb={1.5}>
        {label}
      </chakra.label>
      {children}
    </Box>
  );
}
