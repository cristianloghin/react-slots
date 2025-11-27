# React Slot Component System

A type-safe, flexible slot-based component system for React applications. This system enables the creation of composable components with named "slots" that can be filled by children components.

## 📋 Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Key Features](#key-features)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
  - [Basic Usage](#basic-usage)
  - [Multiple Slot Instances](#multiple-slot-instances)
  - [Required Slots](#required-slots)
  - [Default Content](#default-content)
  - [Non-Slot Children](#non-slot-children)
- [TypeScript Support](#typescript-support)
- [Best Practices](#best-practices)
- [Real-World Applications](#real-world-applications)

## Overview

This slot component system provides a pattern for building complex, composable components in React. Instead of prop drilling or complex component composition, the slots pattern enables a clean, intuitive API for component customization.

```tsx
// Usage example
<Card>
  <Card.Header>Card Title</Card.Header>
  <Card.Body>
    <p>Card content goes here</p>
  </Card.Body>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>
```

## Installation

```bash
# Using npm
npm install @frontend/icomera-utils/with-slots

# Using yarn
yarn add @frontend/icomera-utils/with-slots
```

Or simply copy the `createComponentWithSlots` function from the source code into your project.

## Key Features

- 🔒 **Type-Safe**: Full TypeScript support with proper type inference
- 🧩 **Composable**: Clean, intuitive component composition
- 🔄 **Multiple Slot Instances**: Support for multiple children of the same slot type
- ⚠️ **Validation**: Required slot validation
- 🔍 **Default Content**: Support for default slot content
- 📦 **Non-Slot Children Handling**: Collect and handle non-matching children
- 🛠️ **Flexible Rendering**: Full control over slot positioning and layout

## API Reference

### `createComponentWithSlots`

```typescript
function createComponentWithSlots<
  T extends object,
  S extends Record<string, Slot<any>>
>(
  slots: S,
  slotConfig: { [K in keyof S]?: SlotConfig } = {},
  render: (props: T & { 
    slots: { ... };
    nonSlotChildren: ReactElement[];
  }) => ReactElement
): React.FC<T & { children?: ReactNode }> & S
```

#### Parameters

- `slots`: An object mapping slot names to slot component functions
- `slotConfig`: Optional configuration for each slot
  - `isRequired`: If true, the slot must be provided
  - `multiple`: If true, multiple instances of the slot are collected in an array
  - `defaultContent`: Default content to use if the slot is not provided
- `render`: Function that renders the component using the organized slots

#### Returns

A React component with slot component functions attached as static properties.

## Usage Examples

### Basic Usage

```tsx
// 1. Create slot components
function HeaderSlot({ children }: PropsWithChildren) {
  return <div className="header">{children}</div>;
}

function BodySlot({ children }: PropsWithChildren) {
  return <div className="body">{children}</div>;
}

function FooterSlot({ children }: PropsWithChildren) {
  return <div className="footer">{children}</div>;
}

// 2. Define slots
const cardSlots = {
  Header: HeaderSlot,
  Body: BodySlot,
  Footer: FooterSlot,
} as const; // IMPORTANT!

// 3. Create component with slots
const Card = createComponentWithSlots<
  { className?: string },
  typeof cardSlots
>(
  cardSlots,
  {},
  ({ slots, className }) => (
    <div className={`card ${className || ''}`}>
      {slots.Header}
      {slots.Body}
      {slots.Footer}
    </div>
  )
);

// 4. Usage
function App() {
  return (
    <Card className="custom-card">
      <Card.Header>My Card Title</Card.Header>
      <Card.Body>Card content goes here...</Card.Body>
      <Card.Footer>
        <button>Click me</button>
      </Card.Footer>
    </Card>
  );
}
```

### Multiple Slot Instances

```tsx
// Configuration with multiple instances enabled
const tabsConfig = {
  Tab: { multiple: true },
};

const Tabs = createComponentWithSlots<
  { activeTab?: number },
  typeof tabsSlots
>(
  tabsSlots,
  tabsConfig,
  ({ slots, activeTab = 0 }) => (
    <div className="tabs-container">
      <div className="tabs-header">
        {slots.Tab && Array.isArray(slots.Tab) && slots.Tab.map((tab, index) => (
          <div key={index} className={`tab ${activeTab === index ? 'active' : ''}`}>
            {tab}
          </div>
        ))}
      </div>
    </div>
  )
);

// Usage
<Tabs activeTab={1}>
  <Tabs.Tab>Tab 1</Tabs.Tab>
  <Tabs.Tab>Tab 2</Tabs.Tab>
  <Tabs.Tab>Tab 3</Tabs.Tab>
</Tabs>
```

### Required Slots

```tsx
// Configuration with required slot
const formConfig = {
  Fields: { isRequired: true },
};

// TypeScript will enforce that the Fields slot must be provided
<Form> 
  <Form.Fields>...</Form.Fields>
  {/* Missing Form.Fields would cause a console error and TypeScript error */}
</Form>
```

### Default Content

```tsx
// Configuration with default content
const panelConfig = {
  Footer: { 
    defaultContent: <div className="default-footer">© 2025 Company Inc.</div> 
  },
};

// Footer will show default content if not provided
<Panel>
  <Panel.Body>Main content</Panel.Body>
  {/* Footer will use default content */}
</Panel>
```

### Non-Slot Children

```tsx
// Render function handling non-slot children
const Layout = createComponentWithSlots<{}, typeof layoutSlots>(
  layoutSlots,
  {},
  ({ slots, nonSlotChildren }) => (
    <div className="layout">
      {slots.Header}
      <div className="content">
        {slots.Sidebar}
        <main>
          {/* Render any children that don't match a slot */}
          {nonSlotChildren}
        </main>
      </div>
      {slots.Footer}
    </div>
  )
);

// Usage
<Layout>
  <Layout.Header>Site Header</Layout.Header>
  <Layout.Sidebar>Navigation</Layout.Sidebar>
  {/* These divs will be collected in nonSlotChildren */}
  <div>Main content section 1</div>
  <div>Main content section 2</div>
  <Layout.Footer>Site Footer</Layout.Footer>
</Layout>
```

## TypeScript Support

The system provides full TypeScript support with proper inference:

- Slot prop types are inferred from slot components
- Slot availability is enforced in the render function
- Multiple slots are correctly typed as arrays
- Required slots are enforced

Example of TypeScript inference:

```tsx
// Props with proper types inferred from slots
const Modal = createComponentWithSlots<
  { isOpen: boolean; onClose: () => void },
  typeof modalSlots
>(
  modalSlots,
  modalConfig,
  // slots will have proper typing based on configuration:
  // - Title: ReactElement | null
  // - Body: ReactElement | null 
  // - Actions: ReactElement[]  (because multiple: true)
  ({ slots, isOpen, onClose }) => {
    /* ... */
  }
);
```

## Best Practices

1. **Keep slot components focused**: Each slot should have a clear, specific purpose
2. **Use meaningful slot names**: Names should reflect their purpose (Header, Body, Footer, etc.)
3. **Consider required slots**: Mark slots as required when they're essential for functionality
4. **Provide sensible defaults**: Use default content for optional slots with common patterns
5. **Handle non-slot children appropriately**: Have a plan for how to deal with non-slot children

## Real-World Applications

The slots pattern is particularly useful for:

- **Layout components**: Cards, panels, dialogs, modals
- **Complex UI components**: Tabs, accordions, dashboards
- **Form components**: Input groups, form sections
- **Data visualization**: Charts with customizable legends, tooltips
- **Application shells**: Headers, footers, sidebars, navigation

By using the slots pattern, you can create flexible, reusable components that are easy to customize and maintain.