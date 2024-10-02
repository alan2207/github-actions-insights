import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadContent } from "../utils";

type ExportProps = {
  name: string;
  generateJSONContent: () => string;
  generateCSVContent: () => string;
  disabled?: boolean;
};

export const Export = ({
  name,
  generateJSONContent,
  generateCSVContent,
  disabled,
}: ExportProps) => {
  const handleExportToJSON = (type: "download" | "copy") => {
    const json = generateJSONContent();
    if (type === "download") {
      downloadContent(json, `${name}.json`);
    } else {
      navigator.clipboard.writeText(json);
    }
  };

  const handleExportToCSV = (type: "download" | "copy") => {
    const csv = generateCSVContent();

    if (type === "download") {
      downloadContent(csv, `${name}.csv`);
    } else {
      navigator.clipboard.writeText(csv);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger disabled={disabled}>
        <Button variant="outline">Export</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleExportToJSON("download")}>
          Download JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportToJSON("copy")}>
          Copy JSON to clipboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportToCSV("download")}>
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExportToCSV("copy")}>
          Copy CSV to clipboard
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
