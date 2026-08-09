export interface Payment {
  id: string;
  date: string;
  benefit: string;
  program: string;
  status: 'pending' | 'complete';
  amount: number;
}
