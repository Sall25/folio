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

  useEffect(() => {
    setVisible(open);
  }, [open]);

  return (
    <Card
      onMouseLeave={() => setOpen(false)}
      data-open={visible}
    >
      <CardBody
        style={{
          gap: '15px',
          padding: '10px 10px'
        }}
      >
        {children}
      </CardBody>

    </Card>
  );
}
