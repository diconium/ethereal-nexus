type GetServerSidePropsResult<Props> =
  | { props: Props | Promise<Props> }

type GetServerSidePropsContext<Props> =
  | { props: Props }

export type GetServerSideProps<
  Props extends { [key: string]: any } = { [key: string]: any },
> = (
  context: GetServerSidePropsContext<Props>
) => Promise<GetServerSidePropsResult<Partial<Props>>>
