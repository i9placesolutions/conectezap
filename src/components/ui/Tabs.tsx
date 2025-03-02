import * as React from 'react';
import { Tab } from '@headlessui/react';
import { cn } from '../../lib/utils';

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  ({ defaultValue, value, onValueChange, children, ...props }, ref) => {
    const selectedIndex = React.useMemo(() => {
      const tabTriggers = React.Children.toArray(children).filter(
        (child) => React.isValidElement(child) && child.type === TabsList
      )[0];
      
      if (!React.isValidElement(tabTriggers)) return 0;
      
      const triggers = React.Children.toArray(tabTriggers.props.children);
      return triggers.findIndex(
        (trigger) => 
          React.isValidElement(trigger) && 
          trigger.props.value === (value || defaultValue)
      );
    }, [children, value, defaultValue]);

    return (
      <Tab.Group
        as="div"
        ref={ref}
        defaultIndex={defaultValue ? selectedIndex : undefined}
        selectedIndex={value ? selectedIndex : undefined}
        onChange={(index) => {
          const tabTriggers = React.Children.toArray(children).filter(
            (child) => React.isValidElement(child) && child.type === TabsList
          )[0];
          
          if (!React.isValidElement(tabTriggers)) return;
          
          const triggers = React.Children.toArray(tabTriggers.props.children);
          const trigger = triggers[index];
          
          if (React.isValidElement(trigger) && onValueChange) {
            onValueChange(trigger.props.value);
          }
        }}
        {...props}
      >
        {children}
      </Tab.Group>
    );
  }
);
Tabs.displayName = 'Tabs';

const TabsList = React.forwardRef<
  React.ElementRef<typeof Tab.List>,
  React.ComponentPropsWithoutRef<typeof Tab.List>
>(({ className, ...props }, ref) => (
  <Tab.List
    ref={ref}
    className={cn(
      'inline-flex h-10 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-500',
      className
    )}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof Tab> {
  value: string;
}

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof Tab>,
  TabsTriggerProps
>(({ className, children, value, ...props }, ref) => (
  <Tab
    ref={ref}
    className={({ selected }) =>
      cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        selected
          ? 'bg-white text-primary-600 shadow-sm'
          : 'hover:bg-white/50 hover:text-gray-900',
        className
      )
    }
    {...props}
  >
    {children}
  </Tab>
));
TabsTrigger.displayName = 'TabsTrigger';

interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof Tab.Panel> {
  value: string;
}

const TabsContent = React.forwardRef<
  React.ElementRef<typeof Tab.Panel>,
  TabsContentProps
>(({ className, children, value, ...props }, ref) => (
  <Tab.Panel
    ref={ref}
    className={cn('mt-4', className)}
    {...props}
  >
    {children}
  </Tab.Panel>
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };