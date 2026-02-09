import React, { createContext, useContext } from 'react';

export interface FormDataContextType {
  formData: any;
  setFormData?: (data: any) => void;
}

export const FormDataContext = createContext<FormDataContextType>({ formData: {} });

export const useFormDataContext = () => useContext(FormDataContext);

export const FormDataProvider: React.FC<{ formData: any; setFormData?: (data: any) => void; children: React.ReactNode }> = ({ formData, setFormData, children }) => {
  return (
    <FormDataContext.Provider value={{ formData, setFormData }}>
      {children}
    </FormDataContext.Provider>
  );
};

