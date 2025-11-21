import {Checkbox, Flex, NumberField} from "@adobe/react-spectrum";
import {SpectrumPathbrowserField} from "@/components/SpectrumPathbrowserField.tsx";
import {useI18n} from "@/providers";
import React, {useEffect} from "react";


export interface SpectrumNavigationProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  error?: string | null | undefined
}

interface Navigation {
  navigationRoot?: string;
  structureStart?: string;
  structureDepth?: string;
  collectAllPages?: string;
}


export const SpectrumNavigation = ({ field, value = {}, onChange, error }: SpectrumNavigationProps) => {

  console.log("Rendering SpectrumNavigation with value:", value);

  const {t} = useI18n();

  const { collectAllPages } = value || {};

  const [isToCollectAllPages, setIsToCollectAllPages] = React.useState<boolean>( typeof collectAllPages === 'string' ? collectAllPages === 'true' : collectAllPages );

  const [data, setData] = React.useState<Navigation>(value);


  useEffect(() => {
    onChange(data);
  }, [data]);

  return (
    <Flex direction="column" width={"100%"} gap="size-200" >
      <SpectrumPathbrowserField key={"navigationRoot"} field={{ label: field?.label,
        rootPath: '/content', tooltip: field?.tooltip }} value={value?.navigationRoot} error={error} onChange={(val) => {
        setData((value) => ({ ...value, navigationRoot: val }))
      }} />

      <NumberField key={"structureStart"}
                   width={"100%"}
                   label={t("Exclude Root Levels")} minValue={0}  value={value?.structureStart} onChange={(val) => {
        setData((value) => ({ ...value, structureStart: val?.toString(10) }))
      }} />

      <Checkbox key={"collectAllPages"}
                isSelected={isToCollectAllPages ?? false} onChange={(val) => {
        setIsToCollectAllPages(val)
        setData((prevValue) => ({ ...prevValue, collectAllPages: val?.toString()  }))
      }}>
        {t("Collect all child pages")}
      </Checkbox>

      {isToCollectAllPages ? null :
        (<NumberField width={"100%"} key={"structureDepth"} minValue={1} label={t("Navigation Structure Depth")} value={value?.structureDepth} onChange={(val) => {
        setData((value) => ({ ...value, collectAllPages: "false", structureDepth: val?.toString(10)}))
        }} />)
      }
    </Flex>
  )
}