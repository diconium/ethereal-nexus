import React from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MetadataModalProps {
    onClose: () => void;
    metadata: {
        messageId: string;
        componentName: string;
    };
    updateComponentMetadata: (messageId: string, name: string, version: string) => void;
}

export function UpdateComponentMetadataModal({ metadata, onClose, updateComponentMetadata }: MetadataModalProps) {
    const [formData, setFormData] = React.useState({
        name: metadata.componentName,
        version: '1.0.0'
    });

    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        toast({
            title: `Component metadata updated successfully`,
            description: `A new ${formData.version} version of the ${formData.name} component has been created.`
        });
        updateComponentMetadata(metadata.messageId, formData.name, formData.version);
        onClose();
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Component Metadata</DialogTitle>
                    <DialogDescription>
                        {`There is already a component named ${metadata.componentName} with that specific version. Do you want to update it by creating a new version or do you want to create a new component by changing the name?`}
                    </DialogDescription>
                    <DialogDescription>
                        Update the component name to create a new one or update the version to add a new version of the {metadata.componentName} component
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                                Component Name
                            </label>
                            <input
                                type="text"
                                id="name"
                                pattern="^[a-zA-Z0-9]+$"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="version" className="block text-sm font-medium text-gray-700 mb-1">
                                Version
                            </label>
                            <input
                                type="text"
                                id="version"
                                value={formData.version}
                                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                                pattern="^\d+\.\d+\.\d+$"
                                placeholder="1.0.0"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <Button onClick={onClose} variant="text" className="px-4 py-2 text-orange-500 font-bold text-base p-0">
                            Cancel
                        </Button>
                        <Button type="submit" size="base" className="px-4 py-2">
                            Save Changes and Publish
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
