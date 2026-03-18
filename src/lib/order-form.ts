export type OrderFormValues = {
  name: string;
  content: string;
  warrantyUntil: string;
  finalPrice: string;
  costPrice: string;
};

export type OrderFormState = {
  error?: string;
  success?: string;
  createdOrderId?: string;
  values: OrderFormValues;
};

export const emptyOrderFormValues: OrderFormValues = {
  name: "",
  content: "",
  warrantyUntil: "",
  finalPrice: "",
  costPrice: ""
};
