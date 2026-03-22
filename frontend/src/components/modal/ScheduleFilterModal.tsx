import { useState } from "react";
import styled from "styled-components";
import type {Preference, ScheduleFilters} from "../../types/ScheduleFilters";

type Props = {
    onClose: () => void;
    onGenerate: (filters: ScheduleFilters) => void;
};

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Box = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  width: 400px;
`;

const Section = styled.div`
  margin-top: 15px;
`;

const Title = styled.div`
  font-weight: bold;
  margin-bottom: 5px;
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
`;

const Option = styled.button<{ $active: boolean }>`
  flex: 1;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid #ccc;
  background: ${({ $active }) => ($active ? "#ddd" : "white")};
  cursor: pointer;
`;

const GenerateButton = styled.button`
  margin-top: 20px;
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: none;
  background: black;
  color: white;
  cursor: pointer;
`;

function PreferenceRow({
                           label,
                           value,
                           setValue,
                       }: {
    label: string;
    value: Preference;
    setValue: (v: Preference) => void;
}) {
    return (
        <Section>
            <Title>{label}</Title>
            <Row>
                <Option $active={value === "desc"} onClick={() => setValue("desc")}>
                    First
                </Option>
                <Option $active={value === "none"} onClick={() => setValue("none")}>
                    N/A
                </Option>
                <Option $active={value === "asc"} onClick={() => setValue("asc")}>
                    Last
                </Option>
            </Row>
        </Section>
    );
}

export default function ScheduleFilterModal({ onClose, onGenerate }: Props) {
    const [filters, setFilters] = useState<ScheduleFilters>({
        deadline: "none",
        importance: "none",
        value: "none",
        time: "none",
        subject: "none",
    });

    function update<K extends keyof ScheduleFilters>(key: K, value: Preference) {
        setFilters(prev => ({ ...prev, [key]: value }));
    }

    return (
        <Overlay onClick={onClose}>
            <Box onClick={(e) => e.stopPropagation()}>
                <h3>Customize your schedule</h3>

                <PreferenceRow
                    label="Deadline"
                    value={filters.deadline}
                    setValue={(v) => update("deadline", v)}
                />

                <PreferenceRow
                    label="Importance"
                    value={filters.importance}
                    setValue={(v) => update("importance", v)}
                />

                <PreferenceRow
                    label="Most Value"
                    value={filters.value}
                    setValue={(v) => update("value", v)}
                />

                <PreferenceRow
                    label="Time"
                    value={filters.time}
                    setValue={(v) => update("time", v)}
                />

                <PreferenceRow
                    label="Subject"
                    value={filters.subject}
                    setValue={(v) => update("subject", v)}
                />

                <GenerateButton
                    onClick={() => {
                        onGenerate(filters);
                        onClose();
                    }}
                >
                    Generate Schedule
                </GenerateButton>
            </Box>
        </Overlay>
    );
}