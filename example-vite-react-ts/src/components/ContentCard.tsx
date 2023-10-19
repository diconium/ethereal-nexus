import {FC} from 'react';
import r2wc from "@r2wc/react-to-web-component"
import Button from '@mui/joy/Button';
import Typography from '@mui/joy/Typography';
import {Card, CardContent} from "@mui/joy";
import AspectRatio from "@mui/joy/AspectRatio";

interface Props {
    title: string,
    subtitle: string,
    image: string,
    alt: string,
    cta: string,
    ctalabel: string,
    price: string,
}

const ContentCard: FC<Props> = ({
                                    title = "title",
                                    subtitle = "April 24 to May 02, 2021",
                                    price = "2900 €",
                                    image = "https://images.unsplash.com/photo-1527549993586-dff825b37782?auto=format&fit=crop&w=286",
                                    cta = "#",
                                    ctalabel = "Explore",
                                    alt = ""
                                }) => {

    return (
        <Card sx={{width: 320}}>
            <div>
                <Typography level="title-lg">{title}</Typography>
                <Typography level="body-sm">{subtitle}</Typography>
            </div>
            <AspectRatio minHeight="120px" maxHeight="200px">
                <img
                    src={image}
                    srcSet={`${image} 2x`}
                    loading="lazy"
                    alt={alt}
                />
            </AspectRatio>
            <CardContent orientation="horizontal">
                <div>
                    <Typography level="body-xs">Total price:</Typography>
                    <Typography fontSize="lg" fontWeight="lg">
                        {price}
                    </Typography>
                </div>
                <Button
                    href={cta}
                    variant="solid"
                    size="md"
                    color="primary"
                    aria-label={alt}
                    sx={{ml: 'auto', alignSelf: 'center', fontWeight: 600}}
                >
                    {ctalabel}
                </Button>
            </CardContent>
        </Card>
    );
};

export default ContentCard;

if (!window.customElements.get('content-card')) {
    customElements.define("content-card", r2wc(ContentCard, {
        props: {
            title: "string",
            subtitle: "string",
            image: "string",
            cta: "string",
            ctalabel: "string",
            price: "string",
            alt: "string"
        }
    }))
}
