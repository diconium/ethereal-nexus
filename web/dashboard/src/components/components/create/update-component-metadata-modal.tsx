import React from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MetadataModalProps {
    onClose: () => void;
    messageId: string;
    versions: string[];
    componentName: string;
    updateComponentMetadata: (messageId: string, name: string, version: string) => void;
}

export function UpdateComponentMetadataModal({ messageId, onClose, versions, componentName, updateComponentMetadata }: MetadataModalProps) {
    const [error, setError] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState({
        name: componentName,
        version: '1.0.0'
    });

    const { toast } = useToast();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (versions.includes(formData.version)) {
            setError('This version already exists. Please enter a different version.');
            return;
        }
        toast({
            title: `Component metadata updated. Component name: ${formData.name}. Component version ${formData.version}.`
        });
        updateComponentMetadata(messageId, formData.name, formData.version);
        onClose();
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Component Metadata</DialogTitle>
                    <DialogDescription>
                        There is already an existing component with the same name, do you want to update it by creating a new version or do you want to create a new component by changing the name?
                    </DialogDescription>
                    <DialogDescription>
                        Update the component name to create a new one or update the version to add a new version of the {componentName} component
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
                                Version (Current component versions: [{versions.map((version, index) => index <= versions.length ? `${version}` : `${version},`)}])
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
                            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <Button onClick={onClose} variant="text" className="px-4 py-2 text-orange-500 font-bold text-base p-0">
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" size="base" className="px-4 py-2">
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
