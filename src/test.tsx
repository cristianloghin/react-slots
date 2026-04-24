import { PropsWithChildren, ReactNode } from "react";
import { injectSlotProps } from "./injectSlotProps";
import { slot } from "./slot";
import { createComponentWithSlots } from "./withSlots";

const SimpleSlot = (props: { children: ReactNode; foo?: number }) => (
  <div>
    {props.foo}
    {props.children}
  </div>
);

const HeaderSlot = (props: PropsWithChildren<{ bar: string }>) => (
  <div>
    {props.bar}
    {props.children}
  </div>
);

const ComplexSlot = createComponentWithSlots({
  Header: slot({ component: HeaderSlot }),
}).render<{ __monkey?: number }>(({ slots }) => <div>{slots.Header}</div>);

const TestComp = createComponentWithSlots({
  Basic: slot(),
  Simple: slot({ component: SimpleSlot, props: { foo: 45 } }),
  Complex: slot({ component: ComplexSlot }),
}).render(({ slots }) => (
  <div>
    {slots.Simple}
    {injectSlotProps(slots.Complex, { __monkey: 67 })}
  </div>
));

const Test = () => {
  return (
    <TestComp>
      <TestComp.Basic>Pants</TestComp.Basic>
      <TestComp.Simple>ximple</TestComp.Simple>
      <TestComp.Complex>
        <TestComp.Complex.Header bar="Bingo">Pants</TestComp.Complex.Header>
      </TestComp.Complex>
    </TestComp>
  );
};

const XComp = <TestComp />;
const XSlot = TestComp.Simple;
const XBasic = TestComp.Basic;
const XComplex = TestComp.Complex;

const XComplexHeader = XComplex.Header;
