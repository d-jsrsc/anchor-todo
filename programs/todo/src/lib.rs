use anchor_lang::prelude::*;

declare_id!("6chWeqWm77cNqLeycGHhneL5UR5ZLn6aS5bToDdbL4CN");

const LIST_ITEM_SEED: &[u8] = b"todolistitem";
const LIST_SEED: &[u8] = b"todolist";

#[program]
pub mod todo {
    use anchor_lang::{
        solana_program::{program::invoke, system_instruction::transfer},
        AccountsClose,
    };

    use super::*;

    pub fn new_list(
        ctx: Context<NewList>,
        name: String,
        capacity: u16,
        account_bump: u8,
    ) -> Result<()> {
        let list = &mut ctx.accounts.list;
        list.list_owner = *(ctx.accounts.user.to_account_info().key);
        list.bump = account_bump;
        list.name = name;
        list.capacity = capacity;
        Ok(())
    }

    pub fn add(
        ctx: Context<Add>,
        _list_name: String,
        item_name: String,
        bounty: u64,
    ) -> Result<()> {
        let user = &ctx.accounts.user;
        let list = &mut ctx.accounts.list;
        let item = &mut ctx.accounts.item;

        require!(
            list.lines.len() < list.capacity as usize,
            TodoListError::ListFull
        );

        list.lines.push(*(item.to_account_info().key));
        
        item.list = *list.to_account_info().key;
        item.creator = *user.to_account_info().key;
        item.bump = *ctx.bumps.get("item").unwrap();
        item.name = item_name;

        let account_lamports = **(item.to_account_info().lamports.borrow());
        let transfer_amount = bounty
            .checked_sub(account_lamports)
            .ok_or(TodoListError::BountyTooSmall)?;

        if transfer_amount > 0 {
            invoke(
                &transfer(
                    user.to_account_info().key,
                    item.to_account_info().key,
                    transfer_amount,
                ),
                &[
                    user.to_account_info(),
                    item.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
            )?;
        }

        Ok(())
    }

    pub fn cancel(ctx: Context<Cancel>) -> Result<()> {
        let list = &mut ctx.accounts.list;
        let item = &mut ctx.accounts.item;
        let item_creator = &ctx.accounts.item_creator;

        let user = ctx.accounts.user.to_account_info().key;

        require!(
            &list.list_owner == user || &item.creator == user,
            TodoListError::CancelPermissions
        );
        require!(
            list.lines.contains(item.to_account_info().key),
            TodoListError::ItemNotFound
        );

        item.close(item_creator.to_account_info())?;

        let item_key = ctx.accounts.item.to_account_info().key;
        list.lines.retain(|key| key != item_key);

        Ok(())
    }

    // pub fn finish(ctx: Context<Finish>, _list_name: String) -> Result<()> {
    pub fn finish(ctx: Context<Finish>) -> Result<()> {
        let item = &mut ctx.accounts.item;
        let list = &mut ctx.accounts.list;
        let user = ctx.accounts.user.to_account_info().key;

        require!(
            list.lines.contains(item.to_account_info().key),
            TodoListError::ItemNotFound,
        );

        let is_item_creator = &item.creator == user;
        let is_list_owner: bool = &list.list_owner == user;

        require!(
            is_item_creator || is_list_owner,
            TodoListError::FinishPermissions
        );

        if is_item_creator {
            item.creator_finished = true;
        }
        if is_list_owner {
            item.list_owner_finished = true;
        }

        if item.creator_finished && item.list_owner_finished {
            let item_key = item.to_account_info().key;
            list.lines.retain(|key| key != item_key);
            item.close(ctx.accounts.list_owner.to_account_info())?;
        }

        Ok(())
    }
}

#[error_code]
pub enum TodoListError {
    #[msg("This list is full")]
    ListFull,
    #[msg("Bounty must be enough to mark account rent-exempt")]
    BountyTooSmall,
    #[msg("Only the list owner or item creator may cancel an item")]
    CancelPermissions,
    #[msg("Only the list owner or item creator may finish an item")]
    FinishPermissions,
    #[msg("Item does not belong to this todo list")]
    ItemNotFound,
    #[msg("Specified list owner does not match the pubkey in the list")]
    WrongListOwner,
    #[msg("Specified item creator does not match the pubkey in the item")]
    WrongItemCreator,
}




#[derive(Accounts)]
#[instruction(name: String, capacity: u16, list_bump: u8)]
pub struct NewList<'info> {
    #[account(
        init,
        payer = user,
        space = TodoList::space(&name, capacity),
        seeds = [
            LIST_SEED,
            user.to_account_info().key.as_ref(),
            name_seed(&name)
        ],
        bump
    )]
    pub list: Account<'info, TodoList>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct TodoList {
    pub list_owner: Pubkey,
    pub bump: u8,
    pub capacity: u16,
    pub name: String,
    pub lines: Vec<Pubkey>,
}

impl TodoList {
    fn space(name: &str, capacity: u16) -> usize {
        // discriminator + owner pubkey + bump + capacity
        8 + 32 + 1 + 2 + 
            // name string // 4 ?
            4 + name.len() +
            // vec of item pubkeys
            4 + (capacity as usize) * std::mem::size_of::<Pubkey>()
    }
}



#[derive(Accounts)]
#[instruction(list_name: String, item_name: String, bounty: u64)]
pub struct Add<'info> {
    #[account(
        mut,
        has_one = list_owner @ TodoListError::WrongListOwner,
        seeds = [
            LIST_SEED,
            list_owner.to_account_info().key.as_ref(),
            name_seed(&list_name)
        ],
        bump=list.bump
    )]
    pub list: Account<'info, TodoList>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub list_owner: AccountInfo<'info>,
    // 8 byte discriminator
    #[account(
        init,
        payer = user,
        space = ListItem::space(&item_name),
        seeds = [
            LIST_ITEM_SEED,
            list_owner.to_account_info().key.as_ref(),
            user.to_account_info().key.as_ref(),
            name_seed(&item_name)
        ],
        bump
    )]
    pub item: Account<'info, ListItem>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ListItem {
    pub list: Pubkey,
    pub creator: Pubkey,
    pub creator_finished: bool,
    pub list_owner_finished: bool,
    pub bump: u8,
    pub name: String,
}

impl ListItem {
    fn space(name: &str) -> usize {
        // discriminator + list PDA + creator pubkey + 2 bools + bump + name string
        8 + 32 + 32 + 1 + 1 + 1 + 4 + name.len()
    }
}




#[derive(Accounts)]
pub struct Cancel<'info> {
    #[account(
        mut, 
        has_one = list_owner @ TodoListError::WrongListOwner, 
        seeds = [
            LIST_SEED,
            list_owner.to_account_info().key.as_ref(),
            name_seed(&list.name)
        ],
        bump = list.bump
    )]
    pub list: Account<'info, TodoList>,
    /// CHECK: 
    pub list_owner: AccountInfo<'info>, // pub list_owner: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [
            LIST_ITEM_SEED,
            list_owner.to_account_info().key.as_ref(),
            item_creator.to_account_info().key.as_ref(),
            name_seed(&item.name)
        ],
        bump = item.bump
    )]
    pub item: Account<'info, ListItem>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(
        mut,
        address = item.creator @ TodoListError::WrongItemCreator
    )]
    pub item_creator: AccountInfo<'info>,
    pub user: Signer<'info>,
}


#[derive(Accounts)]
pub struct Finish<'info> {
    #[account(
        mut, 
        has_one = list_owner @ TodoListError::WrongListOwner, 
        seeds = [
            LIST_SEED,
            list_owner.to_account_info().key.as_ref(),
            name_seed(&list.name),
        ],
        bump=list.bump
    )]
    pub list: Account<'info, TodoList>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub list_owner: AccountInfo<'info>,
    #[account(
        mut,
        seeds = [
            LIST_ITEM_SEED,
            list_owner.to_account_info().key.as_ref(),
            item.creator.key().as_ref(),
            name_seed(&item.name)
        ],
        bump=item.bump
    )]
    pub item: Account<'info, ListItem>,
    pub user: Signer<'info>,
}


pub fn name_seed(name: &str) -> &[u8] {
    let b = name.as_bytes();
    if b.len() > 32 {
        &b[0..32]
    } else {
        b
    }
}