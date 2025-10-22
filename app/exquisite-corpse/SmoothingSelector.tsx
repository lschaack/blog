import { IconButton } from "../components/IconButton";
import { InputRange } from "../components/InputRange";
import { Coarse } from "../custom-icons/coarse";
import { SemiSmooth } from "../custom-icons/semi-smooth";
import { Smooth } from "../custom-icons/smooth";

export type SmoothingSelectorProps = {
  value: number;
  onChange: (value: number) => void;
}
export function SmoothingSelector({ value, onChange }: SmoothingSelectorProps) {
  return (
    <div className="flex flex-col gap-3 w-min">
      <InputRange
        label="Smoothing"
        id="smoothing"
        easing="easeInStrong"
        min={1}
        max={1000}
        step={1}
        precision={0}
        value={value}
        onChange={onChange}
      />
      <div className="flex gap-8 justify-between">
        <IconButton
          label="Set smoothing to coarse"
          onClick={() => onChange(1)}
        >
          <Coarse className="stroke-deep-50" />
        </IconButton>
        <IconButton
          label="Set smoothing to semi-smooth"
          onClick={() => onChange(50)}
        >
          <SemiSmooth className="stroke-deep-50" />
        </IconButton>
        <IconButton
          label="Set smoothing to smooth"
          onClick={() => onChange(1000)}
        >
          <Smooth className="stroke-deep-50" />
        </IconButton>
      </div>
    </div>
  );
}
