import { FC } from 'react';
import r2wc from '@r2wc/react-to-web-component';

interface Props {
  title: string;
  description: string;
}

const Table: FC<Props> = ({ title, description }) => {
  return (
    <div>
      <h1>{title}</h1>
      <h5>{description}</h5>
      <table>
        <tbody>
          <tr>
            <th>Nome:</th>
            <td>John Doe</td>
          </tr>
          <tr>
            <th>Email:</th>
            <td>john.doe@example.com</td>
          </tr>
          <tr>
            <th>Phone:</th>
            <td>123-45-678</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default Table;

if (!window.customElements.get('table-component')) {
  customElements.define(
    'table-component',
    r2wc(Table, {
      props: {
        title: 'string',
        description: 'string',
      },
    }),
  );
}
