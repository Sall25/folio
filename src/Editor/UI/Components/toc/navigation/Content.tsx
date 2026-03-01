import { useEffect, useState } from "react";
//import clsx from "clsx";
import { useNavigation } from "./context";
import { type ReactNode } from "react";
import { Card, CardBody } from "../../card";

interface ContentProps {
  children: ReactNode;
  className?: string;
}

export default function Content({ children }: ContentProps) {
  const { open, setOpen } = useNavigation();
  const [visible, setVisible] = useState(false);

  // useEffect(() => {
  //   setVisible(open);

  //   console.log()
  // }, [open]);

  return (
    <Card
      onMouseLeave={() => setOpen(false)}
      data-open={visible}
      style={{
        pointerEvents: `${open ? 'auto' : 'none'}`,
        visibility: `${open ? 'visible' : 'hidden'}`,
        gap: '2px',
        right: '10px'
      }}
    // style={{
    //   overflowY: 'scroll',
    //   maxHeight: '400px'
    // }}
    >
      <CardBody
      // style={{
      //   // gap: '15px',
      //   padding: '10px 10px',
      //   maxWidth: '300px',
      //   display: 'flex',
      //   flexDirection: 'column',
      //   gap: '5px'
      // }}
      >
        {children}
      </CardBody>

    </Card>
  );
}
