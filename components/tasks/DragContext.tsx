import React, { createContext, useContext, useState } from "react";

interface DragContextType {
  isDraggingTask: boolean;
  setIsDraggingTask: (isDragging: boolean) => void;
}

const DragContext = createContext<DragContextType>({
  isDraggingTask: false,
  setIsDraggingTask: () => {},
});

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDraggingTask, setIsDraggingTask] = useState(false);

  return (
    <DragContext.Provider value={{ isDraggingTask, setIsDraggingTask }}>
      {children}
    </DragContext.Provider>
  );
};

export const useDragContext = () => useContext(DragContext);
