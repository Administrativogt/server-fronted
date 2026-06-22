import type { UserLite } from '../api/users';

export interface JurisprudenceCatalog {
  id: number;
  name: string;
}

export type Tribunal = JurisprudenceCatalog;
export type GeneralTheme = JurisprudenceCatalog;
export type FailureType = JurisprudenceCatalog;
export type SenseOfFailure = JurisprudenceCatalog;
export type JurisprudenceState = JurisprudenceCatalog;

export interface Sentence {
  id: number;
  creator?: UserLite | null;
  is_intern: boolean;
  expedient: string;
  signers: string;
  client: string;
  opposing_party: string;
  init_date: string | null;
  end_date: string | null;
  specific_theme: string;
  sub_theme: string;
  law: string;
  article: string;
  subsection: string;
  tax_credit_refund: string;
  tax_period: string;
  jurisprudential_criterion: string;
  jurisprudential_line: string;
  sentence_link: string;
  link: string;
  sentence_file: string | null;
  failure_type: FailureType;
  tribunal: Tribunal;
  sense_of_failure: SenseOfFailure;
  general_theme: GeneralTheme;
  state: JurisprudenceState;
  related_expedient?: Sentence[];
}

export interface PaginatedSentences {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  results: Sentence[];
}

export interface AllCatalogs {
  tribunals: Tribunal[];
  general_themes: GeneralTheme[];
  failure_types: FailureType[];
  senses_of_failure: SenseOfFailure[];
  states: JurisprudenceState[];
}

export type CatalogKind =
  | 'tribunals'
  | 'general-themes'
  | 'failure-types'
  | 'senses-of-failure'
  | 'states';

export interface SentenceFormPayload {
  is_intern?: boolean;
  expedient?: string;
  signers?: string;
  client?: string;
  opposing_party?: string;
  init_date?: string | null;
  end_date?: string | null;
  specific_theme?: string;
  sub_theme?: string;
  law?: string;
  article?: string;
  subsection?: string;
  tax_credit_refund?: string;
  tax_period?: string;
  jurisprudential_criterion?: string;
  jurisprudential_line?: string;
  sentence_link?: string;
  link?: string;
  failure_type: number;
  tribunal: number;
  sense_of_failure: number;
  general_theme: number;
  state: number;
  related_expedient?: number[];
}

export interface DashboardStats {
  totals: {
    total: number;
    with_file: number;
    interns: number;
    last_30_days: number;
    this_year: number;
    distinct_tribunals: number;
    distinct_clients: number;
  };
  by_tribunal: BucketCount[];
  by_general_theme: BucketCount[];
  by_sense_of_failure: BucketCount[];
  by_failure_type: BucketCount[];
  by_state: BucketCount[];
  by_year: { year: number; count: number }[];
  top_clients: BucketCount[];
  recent: Array<{
    id: number;
    expedient: string;
    specific_theme: string;
    end_date: string | null;
    tribunal: string | null;
    sense_of_failure: string | null;
  }>;
}

export interface BucketCount {
  id: number | null;
  name: string;
  count: number;
}

export interface SentenceFilter {
  is_intern?: boolean;
  expedient?: string;
  signers?: string;
  client?: string;
  init_date?: string;
  end_date?: string;
  specific_theme?: string;
  sub_theme?: string;
  law?: string;
  article?: string;
  subsection?: string;
  tax_period?: string;
  jurisprudential_criterion?: string;
  jurisprudential_line?: string;
  failure_type?: number;
  tribunal?: number;
  sense_of_failure?: number;
  general_theme?: number;
  state?: number;
  page?: number;
  page_size?: number;
}
