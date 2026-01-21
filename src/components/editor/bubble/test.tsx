import type { PropsWithChildren } from "react";

type RootProps = {
  children: PropsWithChildren['children'];
}

type ContentProps = {
  children: ItemProps
}

type ItemProps = RootProps;

type DropdownProps = {
  children: PropsWithChildren['children']
}

function Root({ children }: RootProps) {
  return (
    <>
      {children}
    </>
  );
}

function Content({ children }: ContentProps) {
  return (
    <>
    {children}
    </>
  );
}

function Item({ children }: ItemProps) {
  return (
    <>
      {children}
    </>
  )
}

function Dropdown({ root, content }: DropdownProps) {
  return (
    <>
    {root}
    {content}
    </>
  );
}

function DropdownComp(){
  return (
    <Dropdown>
      <Root>
        <span>root</span>
      </Root>
      <Content>
        <Item>
          <span>Item 1</span>
        </Item>
      </Content>
    </Dropdown>
  )
}