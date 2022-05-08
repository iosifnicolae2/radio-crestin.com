import {Station, StationGroup} from "../../types";
import {Box, Button, Flex} from "@chakra-ui/react";
import Link from "next/link";
import React from "react";


export default function StationGroups({stationGroups, selectedStationGroup, selectedStation}: {
  stationGroups: StationGroup[],
  selectedStationGroup: StationGroup,
  selectedStation: Station
}) {
  return (
    <Flex ml={2} mt={6} mb={9} alignItems='center' gap='2' style={{"overflow": "auto"}} pr={{base: 2, lg: 0}} pb={{base: 3, lg: 0}}>
      {stationGroups.map((stationGroup) => (
        <Box key={stationGroup.slug}>

          <Link href={`/${encodeURIComponent(stationGroup?.slug)}/${encodeURIComponent(selectedStation?.slug)}`} scroll={false}>
            <a>
              <Button key={stationGroup.slug} isActive={stationGroup.slug === selectedStationGroup.slug} >
                {stationGroup.name}
              </Button>
            </a>
          </Link>

        </Box>
      ))}
    </Flex>
  );
}
