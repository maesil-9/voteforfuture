import NextLink from "next/link";
import { Flex, Link } from "@chakra-ui/react";

const TABS = [
  { slug: "", label: "개요" },
  { slug: "/candidates", label: "후보" },
  { slug: "/review", label: "검수" },
  { slug: "/turnout", label: "현황" },
  { slug: "/results", label: "결과" },
];

export function ElectionTabs({
  electionId,
  active,
}: {
  electionId: string;
  active: "" | "/candidates" | "/review" | "/turnout" | "/results";
}) {
  return (
    <Flex
      as="nav"
      aria-label="선거 관리 메뉴"
      gap={1}
      borderBottom="2px solid"
      borderColor="ink.700"
      overflowX="auto"
      mb={6}
    >
      {TABS.map((tab) => {
        const isActive = tab.slug === active;
        return (
          <Link
            asChild
            key={tab.slug}
            px={4}
            py={2}
            fontSize="sm"
            fontWeight={isActive ? 800 : 600}
            color={isActive ? "paper.50" : "fg.muted"}
            bg={isActive ? "ink.900" : "transparent"}
            borderTopRadius="sm"
            _hover={{ textDecoration: "none", bg: isActive ? "ink.900" : "paper.200" }}
            whiteSpace="nowrap"
            aria-current={isActive ? "page" : undefined}
          >
            <NextLink href={`/admin/elections/${electionId}${tab.slug}`}>
              {tab.label}
            </NextLink>
          </Link>
        );
      })}
    </Flex>
  );
}
