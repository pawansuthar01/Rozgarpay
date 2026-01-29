"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import MessageModal from "./MessageModal";

interface ModalContextType {
  showMessage: (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string,
    onConfirm?: () => void,
  ) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
  ) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
}

interface ModalProviderProps {
  children: ReactNode;
}

export function ModalProvider({ children }: ModalProviderProps) {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: "success" | "error" | "warning" | "info" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const showMessage = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string,
    onConfirm?: () => void,
  ) => {
    setModalState({
      isOpen: true,
      type,
      title,
      message,
      onConfirm,
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
  ) => {
    setModalState({
      isOpen: true,
      type: "confirm",
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  const closeModal = () => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    if (modalState.onConfirm) {
      modalState.onConfirm();
    }
    closeModal();
  };

  const handleCancel = () => {
    if (modalState.onCancel) {
      modalState.onCancel();
    }
    closeModal();
  };

  return (
    <ModalContext.Provider value={{ showMessage, showConfirm }}>
      {children}
      <MessageModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        onConfirm={
          modalState.type === "confirm"
            ? handleConfirm
            : () => {
                if (modalState.onConfirm) modalState.onConfirm();
                closeModal();
              }
        }
        onCancel={modalState.type === "confirm" ? handleCancel : undefined}
      />
    </ModalContext.Provider>
  );
}
