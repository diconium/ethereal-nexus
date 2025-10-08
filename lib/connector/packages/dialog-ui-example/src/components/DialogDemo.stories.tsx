import type { Meta, StoryObj } from '@storybook/react';
import { DialogDemo } from './DialogDemo';

const meta = {
  title: 'Components/DialogDemo',
  component: DialogDemo,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A comprehensive demo showing how to use dialog-ui-core with different CMS adapters (AEM, Typo3, Strapi). This component demonstrates:\n\n- **AEM Integration**: Simulates reading dialog structure from web component data attributes\n- **Typo3 Integration**: Shows API-based dialog fetching from Typo3 backend\n- **Strapi Integration**: Demonstrates headless CMS integration via REST API\n\nEach CMS adapter transforms the dialog structure into a common format that can be rendered with shadcn/ui components.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    cmsType: {
      control: 'select',
      options: ['aem', 'typo3', 'strapi'],
      description: 'The CMS type to demonstrate',
      defaultValue: 'aem'
    },
  },
} satisfies Meta<typeof DialogDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AEMIntegration: Story = {
  args: {
    cmsType: 'aem',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates AEM integration where dialog structure comes from web component data attributes. This is the fastest loading approach since data is embedded in the component.'
      }
    }
  }
};

export const Typo3Integration: Story = {
  args: {
    cmsType: 'typo3',
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows Typo3 integration with API calls to fetch dialog structure and field values. The adapter handles Typo3-specific data transformation.'
      }
    }
  }
};

export const StrapiIntegration: Story = {
  args: {
    cmsType: 'strapi',
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates Strapi headless CMS integration via REST API. Shows how to work with Strapi\'s data structure and API authentication.'
      }
    }
  }
};

export const AllCMSComparison: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold mb-4">AEM (Data Attributes)</h3>
        <DialogDemo cmsType="aem" />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Typo3 (API Calls)</h3>
        <DialogDemo cmsType="typo3" />
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-4">Strapi (Headless API)</h3>
        <DialogDemo cmsType="strapi" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Side-by-side comparison of all three CMS integrations showing how the same dialog structure can be rendered from different data sources.'
      }
    }
  }
};
